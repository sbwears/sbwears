import "server-only";
import { db } from "../supabase";
import { HttpError, json, must, isUuid, num } from "../http";
import {
  assertSelf,
  checkAdminCredentials,
  generateOtp,
  hashOtp,
  otpMatches,
  signAdminToken,
  signUserToken,
} from "../auth";
import { sendOtpSms, otpDevMode } from "../sms";
import * as S from "../serialize";

const PHONE_RE = /^\+?[1-9]\d{1,14}$/;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_AFTER_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const USER_WITH_CART =
  "*, cart_items(*, category_products(*, product_size_stock(*)))";

async function cartOf(userId) {
  const rows = must(
    await db().from("cart_items").select().eq("user_id", userId).order("added_at")
  );
  return rows.map(S.cartItem);
}

// ------------------------------------------------------------------ OTP login

export async function reqOTP({ body }) {
  const phoneNumber = String(body.phoneNumber ?? "").trim();
  if (!phoneNumber) throw new HttpError(400, { error: "Phone number is required" });
  if (!PHONE_RE.test(phoneNumber)) throw new HttpError(400, { error: "Please fill a valid phone number" });

  let user = must(await db().from("users").select().eq("phone_number", phoneNumber).maybeSingle());
  if (!user) {
    user = must(await db().from("users").insert({ phone_number: phoneNumber }).select().single());
  }

  // Throttle resends so the SMS endpoint can't be used to spam a number.
  const issuedAt = user.otp_expires_at ? new Date(user.otp_expires_at).getTime() - OTP_TTL_MS : 0;
  if (Date.now() - issuedAt < OTP_RESEND_AFTER_MS) {
    throw new HttpError(429, { error: "Please wait a few seconds before requesting another OTP" });
  }

  const otp = generateOtp();
  must(
    await db()
      .from("users")
      .update({
        otp_hash: hashOtp(phoneNumber, otp),
        otp_expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
        otp_attempts: 0,
      })
      .eq("id", user.id)
  );

  if (otpDevMode()) {
    // Development only: the UI shows the code in a toast, as the old backend did.
    return json({ message: "OTP sent successfully", otp });
  }
  await sendOtpSms(phoneNumber, otp);
  return json({ message: "OTP sent successfully" });
}

export async function verifyOTP({ body }) {
  const phoneNumber = String(body.phoneNumber ?? "").trim();
  const otp = String(body.otp ?? "").trim();
  if (!phoneNumber || !otp) throw new HttpError(400, { error: "Phone number and OTP are required" });

  const user = must(await db().from("users").select().eq("phone_number", phoneNumber).maybeSingle());
  if (!user || !user.otp_hash || !user.otp_expires_at || new Date(user.otp_expires_at) <= new Date()) {
    throw new HttpError(400, { error: "Invalid OTP or OTP expired" });
  }
  if (user.otp_attempts >= OTP_MAX_ATTEMPTS) {
    throw new HttpError(429, { error: "Too many attempts. Please request a new OTP" });
  }
  if (!otpMatches(user.otp_hash, phoneNumber, otp)) {
    must(await db().from("users").update({ otp_attempts: user.otp_attempts + 1 }).eq("id", user.id));
    throw new HttpError(400, { error: "Invalid OTP" });
  }

  const updated = must(
    await db()
      .from("users")
      .update({ otp_hash: null, otp_expires_at: null, otp_attempts: 0 })
      .eq("id", user.id)
      .select()
      .single()
  );
  const token = await signUserToken(updated);
  return json({ message: "Login successful", token, user: S.user(updated) });
}

// ------------------------------------------------------------------ profile

export async function getUser({ params, auth }) {
  const { id } = params;
  if (!id || id === "null" || !isUuid(id)) throw new HttpError(400, { message: "Invalid user ID" });
  assertSelf(auth, id);
  const row = must(
    await db()
      .from("users")
      .select(USER_WITH_CART)
      .eq("id", id)
      .order("added_at", { referencedTable: "cart_items" })
      .maybeSingle()
  );
  if (!row) throw new HttpError(404, { message: "User Not Found" });
  return json(S.user(row, { dobParts: true }));
}

function toIsoDate({ day, month, year } = {}) {
  const d = Number(day), m = Number(month), y = Number(year);
  if (!d || !m || !y) return undefined;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new HttpError(400, { message: "Invalid date of birth" });
  }
  return date.toISOString().slice(0, 10);
}

export async function updateUser({ body, auth }) {
  const { userId } = body;
  if (!userId) throw new HttpError(400, { message: "User ID is required" });
  if (!isUuid(userId)) throw new HttpError(404, { message: "User not found" });
  assertSelf(auth, userId);

  const patch = {};
  if (body.firstName) patch.first_name = body.firstName;
  if (body.lastName) patch.last_name = body.lastName;
  if (body.email) {
    if (!/^\S+@\S+\.\S+$/.test(body.email)) throw new HttpError(400, { message: "Invalid email format" });
    patch.email = body.email;
  }
  if (body.dob) {
    const dob = toIsoDate(body.dob);
    if (dob) patch.dob = dob;
  }
  if (body.gender) {
    if (!["Male", "Female", "Other"].includes(body.gender)) {
      throw new HttpError(400, { message: "Invalid gender value" });
    }
    patch.gender = body.gender;
  }
  if (body.shippingDetails && typeof body.shippingDetails === "object") {
    const phone = body.shippingDetails.phoneNumber;
    if (phone && !PHONE_RE.test(String(phone))) {
      throw new HttpError(400, { message: "Please fill a valid phone number" });
    }
    patch.shipping_details = body.shippingDetails;
  }

  const query = Object.keys(patch).length
    ? db().from("users").update(patch).eq("id", userId).select().maybeSingle()
    : db().from("users").select().eq("id", userId).maybeSingle();
  const row = must(await query);
  if (!row) throw new HttpError(404, { message: "User not found" });
  return json({ message: "User details updated successfully", user: S.user(row) });
}

export async function getAllUsers() {
  const rows = must(
    await db().from("users").select("*, cart_items(*)").order("created_at", { ascending: false })
  );
  return json(rows.map((r) => S.user(r)));
}

// ------------------------------------------------------------------ cart

const productIdOf = (v) => (v && typeof v === "object" ? v._id : v);

export async function addToCart({ body, auth }) {
  const { userId, size } = body;
  const productId = productIdOf(body.productId);
  const quantity = num(body.quantity, 1);
  assertSelf(auth, userId);
  if (!Number.isInteger(quantity) || quantity < 1) throw new HttpError(400, { error: "Invalid quantity" });
  if (!isUuid(userId) || !isUuid(productId)) throw new HttpError(404, { error: "User or Product not found" });

  const [user, product] = await Promise.all([
    db().from("users").select("id").eq("id", userId).maybeSingle().then(must),
    db().from("category_products").select("id, available_sizes").eq("id", productId).maybeSingle().then(must),
  ]);
  if (!user || !product) throw new HttpError(404, { error: "User or Product not found" });
  if (!(product.available_sizes ?? []).includes(size)) {
    throw new HttpError(400, { error: "Selected size not available" });
  }

  must(
    await db().rpc("add_to_cart", { p_user_id: userId, p_product_id: productId, p_size: size, p_quantity: quantity })
  );
  return json(await cartOf(userId));
}

export async function removeFromCart({ body, auth }) {
  const { userId, size, removeAll = false } = body;
  const productId = productIdOf(body.productId);
  assertSelf(auth, userId);
  if (!isUuid(userId)) throw new HttpError(404, { error: "User not found" });
  if (!isUuid(productId)) throw new HttpError(404, { error: "Product not found in cart" });

  const found = must(
    await db().rpc("remove_from_cart", {
      p_user_id: userId,
      p_product_id: productId,
      p_size: size,
      p_remove_all: Boolean(removeAll),
    })
  );
  if (!found) throw new HttpError(404, { error: "Product not found in cart" });
  return json(await cartOf(userId));
}

export async function abandonedCart() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = must(await db().from("users").select(USER_WITH_CART).order("created_at", { ascending: false }));
  const usersWithAbandonedCarts = rows
    .map((r) => {
      const u = S.user(r);
      const oldCartItems = u.cart.filter((item) => new Date(item.addedAt) < sevenDaysAgo);
      return oldCartItems.length > 0 ? { ...u, oldCartItems } : null;
    })
    .filter(Boolean);
  return json({ usersWithAbandonedCarts });
}

// ------------------------------------------------------------------ admin account

export async function adminLogin({ body }) {
  const { email, password } = body;
  if (!checkAdminCredentials(email, password)) {
    throw new HttpError(401, { error: "Invalid credentials" });
  }
  const token = await signAdminToken(String(email).toLowerCase());
  return json({ message: "Login successful", token, email });
}

export async function adminUpdate({ query, body, auth }) {
  const email = String(query.email || auth.email || "").toLowerCase();
  if (!email) throw new HttpError(400, { error: "Email is required" });
  const patch = { email };
  if (body.phone !== undefined) patch.phone = body.phone;
  if (body.address !== undefined) patch.address = body.address;
  if (body.socialMedia && typeof body.socialMedia === "object") patch.social_media = body.socialMedia;
  const row = must(await db().from("admins").upsert(patch, { onConflict: "email" }).select().single());
  return json({ message: "Admin details updated successfully", admin: S.admin(row) });
}

export async function adminDetails({ body }) {
  const email = String(body.email ?? "").toLowerCase();
  if (!email) throw new HttpError(400, { error: "Email is required" });
  const row = must(await db().from("admins").select().eq("email", email).maybeSingle());
  if (!row) throw new HttpError(404, { error: "Admin not found" });
  return json({ message: "Admin details retrieved successfully", admin: S.admin(row) });
}
