import "server-only";
import { createRequire } from "node:module";
import { db } from "../supabase";
import { HttpError, json, must, isUuid, num } from "../http";
import { assertSelf } from "../auth";
import { normalizeOrderRequest, quoteOrder, validateOrderRequest } from "./orders";
import * as S from "../serialize";

const require = createRequire(import.meta.url);

let phonepe;

/**
 * PHONEPE_ENV=MOCK: no real gateway. "Paying" sends the customer straight to the
 * PaymentSuccess page and every payment reports COMPLETED. Local development only.
 */
const mockPayments = () => process.env.PHONEPE_ENV === "MOCK";

function phonePe() {
  if (mockPayments()) {
    return {
      sdk: null,
      client: {
        pay: async (req) => ({ orderId: `MOCK-${req.merchantOrderId}`, redirectUrl: req.redirectUrl }),
        getOrderStatus: async () => ({ state: "COMPLETED" }),
      },
    };
  }
  if (phonepe) return phonepe;
  if (phonepe) return phonepe;
  const clientId = process.env.PHONEPE_CLIENT_ID;
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new HttpError(503, { error: "Online payments are not configured" });
  }
  const sdk = require("pg-sdk-node");
  const env = process.env.PHONEPE_ENV === "PRODUCTION" ? sdk.Env.PRODUCTION : sdk.Env.SANDBOX;
  const client = sdk.StandardCheckoutClient.getInstance(
    clientId,
    clientSecret,
    Number(process.env.PHONEPE_CLIENT_VERSION || 1),
    env
  );
  phonepe = { sdk, client };
  return phonepe;
}

function siteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SITE_URL must be set for payment redirects");
  return url.replace(/\/$/, "");
}

/** Only same-site paths, so the payment page can't be turned into an open redirect. */
const localPath = (value, fallback) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : fallback;

/**
 * The checkout page sends `config`: a serialised axios request for
 * POST /api/orders/createOrder to run once the payment succeeds. The old server replayed
 * that request verbatim (any URL, any body). Here only the order payload is taken from
 * it, the user is forced to the signed-in user, and the order is placed internally.
 */
function pendingOrderFrom(config, userId) {
  if (!config) return null;
  let parsed;
  try {
    parsed = typeof config === "string" ? JSON.parse(config) : config;
  } catch {
    throw new HttpError(400, { error: "Invalid order details" });
  }
  const path = (() => {
    try {
      return new URL(String(parsed?.url ?? ""), "http://local").pathname;
    } catch {
      return "";
    }
  })();
  if (!path.endsWith("/api/orders/createOrder")) {
    throw new HttpError(400, { error: "Unsupported post-payment action" });
  }
  const req = normalizeOrderRequest(parsed.data, userId);
  validateOrderRequest(req);
  return req;
}

export async function addPaymentPhone({ body, auth }) {
  const { userId, username, Mobile, orderId } = body;
  assertSelf(auth, userId);
  if (!isUuid(userId)) throw new HttpError(404, { error: "User not found" });

  const pendingOrder = pendingOrderFrom(body.config, userId);
  // Charge what the database says the items cost — never the amount the browser sent.
  const amount = pendingOrder ? await quoteOrder(pendingOrder) : num(body.amount);
  if (!amount || amount <= 0) throw new HttpError(400, { error: "Invalid amount" });

  const { sdk, client } = phonePe();
  const txn = must(
    await db()
      .from("payment_transactions")
      .insert({
        user_id: userId,
        username,
        mobile: Mobile ? String(Mobile) : null,
        order_ref: orderId,
        amount,
        pending_order: pendingOrder,
        success_url: localPath(body.successUrl, "/account"),
        failed_url: localPath(body.failedUrl, "/checkout"),
      })
      .select()
      .single()
  );

  const redirectUrl = `${siteUrl()}/PaymentSuccess?transactionId=${txn.id}&userID=${userId}`;
  const request = sdk
    ? sdk.StandardCheckoutPayRequest.builder()
        .merchantOrderId(txn.id)
        .amount(Math.round(amount * 100)) // paise
        .redirectUrl(redirectUrl)
        .build()
    : { merchantOrderId: txn.id, amount: Math.round(amount * 100), redirectUrl };

  let response;
  try {
    response = await client.pay(request);
  } catch (error) {
    console.error("PhonePe pay failed", error);
    await db().from("payment_transactions").update({ status: "FAILED" }).eq("id", txn.id);
    throw new HttpError(502, { error: "Payment processing failed" });
  }
  if (!response?.redirectUrl) {
    console.error("PhonePe did not return a URL", response);
    throw new HttpError(502, { error: "PhonePe did not return a URL" });
  }

  await db().from("payment_transactions").update({ transaction_id: response.orderId }).eq("id", txn.id);
  return json({ orderId: response.orderId, merchantID: txn.id, url: response.redirectUrl });
}

/** Asks PhonePe for the real status and, if paid, creates the order (once). */
async function syncWithPhonePe(txnId) {
  const { client } = phonePe();
  const status = await client.getOrderStatus(txnId);
  const state = status?.state;
  if (!state) throw new HttpError(502, { error: "Could not read payment status" });

  must(await db().from("payment_transactions").update({ status: state }).eq("id", txnId));
  if (state === "COMPLETED") {
    must(await db().rpc("finalize_payment", { p_txn_id: txnId }));
  }
  return must(await db().from("payment_transactions").select().eq("id", txnId).single());
}

export async function checkPayment({ params, auth }) {
  const { id, userId } = params;
  assertSelf(auth, userId);
  if (!isUuid(id)) throw new HttpError(400, { error: "Payment Id not found!" });
  const txn = must(await db().from("payment_transactions").select("id, user_id").eq("id", id).maybeSingle());
  if (!txn || txn.user_id !== userId) throw new HttpError(400, { error: "Payment Id not found!" });

  try {
    return json({ success: S.transaction(await syncWithPhonePe(id)) });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("PhonePe status check failed", error);
    throw new HttpError(400, { error: "Could not verify payment status" });
  }
}

/**
 * Server-to-server notification from PhonePe. The payload is NOT trusted (the old
 * handler took its word for "COMPLETED"); we only extract which transaction it is about
 * and re-check that transaction's status with PhonePe directly.
 */
export async function paymentCallback({ body }) {
  let txnId = body?.payload?.merchantOrderId ?? body?.merchantOrderId;
  if (!txnId && typeof body?.response === "string") {
    try {
      const decoded = JSON.parse(Buffer.from(body.response, "base64").toString("utf8"));
      txnId = decoded?.data?.merchantTransactionId;
    } catch {
      /* fall through */
    }
  }
  if (!isUuid(txnId)) throw new HttpError(400, { error: "Unrecognised callback" });

  const exists = must(await db().from("payment_transactions").select("id").eq("id", txnId).maybeSingle());
  if (exists) {
    try {
      await syncWithPhonePe(txnId);
    } catch (error) {
      console.error("PhonePe callback sync failed", txnId, error);
    }
  }
  return new Response("Callback processed", { status: 200 });
}

export async function updateStatusPayment({ params }) {
  if (!isUuid(params.id)) throw new HttpError(400, { error: "Data not found" });
  const row = must(
    await db().from("payment_transactions").update({ status: "Completed" }).eq("id", params.id).select("id").maybeSingle()
  );
  if (!row) throw new HttpError(400, { error: "Data not found" });
  return json({ success: "Successfully Completed" });
}

export async function getAllPayments() {
  const rows = must(await db().from("payment_transactions").select().order("created_at", { ascending: false }));
  return json({ success: rows.map(S.transaction) });
}
