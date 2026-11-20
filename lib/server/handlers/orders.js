import "server-only";
import { db } from "../supabase";
import { HttpError, json, must, isUuid } from "../http";
import { assertSelf } from "../auth";
import * as S from "../serialize";

const ORDER_SELECT = "*, users(id, first_name, last_name, phone_number, email)";
const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"];
const PAYMENT_METHODS = ["UPI", "Card", "NetBanking", "COD", "Online"];

const fail = (status, error) => new HttpError(status, { success: false, error });

/**
 * Normalises an order request from the checkout page. Cart lines arrive with
 * `productId` populated (an object); only id/size/quantity are kept — prices are
 * always read from the database.
 */
export function normalizeOrderRequest(data, userId) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    userId,
    items: items.map((item) => ({
      productId: item?.productId && typeof item.productId === "object" ? item.productId._id : item?.productId,
      size: item?.size,
      quantity: Number(item?.quantity),
    })),
    address: data?.address && typeof data.address === "object" ? data.address : null,
    couponCode: typeof data?.couponCode === "string" ? data.couponCode.trim() : null,
    paymentMethod: PAYMENT_METHODS.includes(data?.paymentMethod) ? data.paymentMethod : "UPI",
  };
}

export function validateOrderRequest(req) {
  if (!req.userId || req.items.length === 0 || !req.address) {
    throw fail(400, "Missing required fields: userId, items, or address");
  }
  for (const item of req.items) {
    if (!isUuid(item.productId)) throw fail(404, `Product ${item.productId} not found`);
    if (!item.size || !Number.isInteger(item.quantity) || item.quantity < 1) {
      throw fail(400, "Each item needs a size and a quantity of at least 1");
    }
  }
}

/** Subtotal from database prices, after checking every line is in stock. */
export async function quoteOrder(req) {
  const ids = [...new Set(req.items.map((i) => i.productId))];
  const products = must(
    await db().from("category_products").select("id, name, offer_price, product_size_stock(*)").in("id", ids)
  );
  const byId = new Map(products.map((p) => [p.id, p]));
  let subtotal = 0;
  for (const item of req.items) {
    const product = byId.get(item.productId);
    if (!product) throw fail(404, `Product ${item.productId} not found`);
    const stock = product.product_size_stock.find((s) => s.size === item.size);
    if (!stock) throw fail(400, `Size ${item.size} not available for product ${product.name}`);
    if (stock.quantity < item.quantity) {
      throw fail(400, `Not enough stock for ${product.name} (${item.size}). Available: ${stock.quantity}`);
    }
    subtotal += Number(product.offer_price) * item.quantity;
  }
  return Math.round(subtotal * 100) / 100;
}

async function placeOrder(req) {
  const { data, error } = await db().rpc("place_order", {
    p_user_id: req.userId,
    p_items: req.items,
    p_address: req.address,
    p_payment_method: req.paymentMethod,
    p_coupon_code: req.couponCode,
  });
  if (error) {
    if (error.code === "SB404") throw fail(404, error.message);
    if (error.code === "SB400") throw fail(400, error.message);
    throw error;
  }
  return data;
}

export async function createOrder({ body, auth }) {
  assertSelf(auth, body.userId);
  const req = normalizeOrderRequest(body, body.userId);
  validateOrderRequest(req);

  const user = must(await db().from("users").select("id").eq("id", req.userId).maybeSingle());
  if (!user) throw fail(404, "User not found");

  const order = await placeOrder(req);
  return json(
    { success: true, message: "Order created successfully", order: S.order(order), paymentStatus: "Pending" },
    201
  );
}

const pageParams = (query, defaultLimit) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, from: (page - 1) * limit, to: page * limit - 1 };
};

async function listOrders({ query, userId, defaultLimit }) {
  const { page, limit, from, to } = pageParams(query, defaultLimit);
  let q = db().from("orders").select(ORDER_SELECT, { count: "exact" }).order("created_at", { ascending: false });
  if (userId) q = q.eq("user_id", userId);
  if (query.status) q = q.eq("status", query.status);
  const { data, count, error } = await q.range(from, to);
  if (error) throw error;
  return json({
    success: true,
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / limit),
    currentPage: page,
    orders: data.map(S.order),
  });
}

/**
 * Admins get every order. Shoppers get only their own: the "My Orders" screen calls
 * this endpoint and used to receive every customer's orders, filtering in the browser.
 */
export async function getAllOrders({ query, auth }) {
  const userId = auth.role === "admin" ? null : auth.userId;
  return listOrders({ query, userId, defaultLimit: 10 });
}

export async function getUserOrders({ params, query, auth }) {
  assertSelf(auth, params.userId);
  if (!isUuid(params.userId)) throw fail(404, "User not found");
  return listOrders({ query, userId: params.userId, defaultLimit: 5 });
}

export async function getOrderById({ params, auth }) {
  if (!isUuid(params.id)) throw fail(404, "Order not found");
  const row = must(await db().from("orders").select(ORDER_SELECT).eq("id", params.id).maybeSingle());
  if (!row || (auth.role !== "admin" && row.user_id !== auth.userId)) throw fail(404, "Order not found");

  const order = S.order(row);
  const ids = [...new Set(order.items.map((i) => i.productId).filter(isUuid))];
  if (ids.length) {
    const products = must(await db().from("category_products").select("id, name, offer_price, images").in("id", ids));
    const byId = new Map(products.map((p) => [p.id, { _id: p.id, name: p.name, offerPrice: p.offer_price, images: p.images }]));
    order.items = order.items.map((i) => ({ ...i, productId: byId.get(i.productId) ?? i.productId }));
  }
  return json({ success: true, order });
}

async function updateOrderField({ orderId, field, value }) {
  if (!isUuid(orderId)) throw fail(404, "Order not found");
  const row = must(
    await db().from("orders").update({ [field]: value }).eq("id", orderId).select(ORDER_SELECT).maybeSingle()
  );
  if (!row) throw fail(404, "Order not found");
  return json({ success: true, order: S.order(row) });
}

export async function updateOrderStatus({ params, body }) {
  if (!ORDER_STATUSES.includes(body.status)) throw fail(400, "Invalid status value");
  return updateOrderField({ orderId: params.orderId, field: "status", value: body.status });
}

export async function updatePaymentStatus({ params, body }) {
  if (!PAYMENT_STATUSES.includes(body.paymentStatus)) throw fail(400, "Invalid payment status value");
  return updateOrderField({ orderId: params.orderId, field: "payment_status", value: body.paymentStatus });
}
