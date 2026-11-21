import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Local development database used when Supabase isn't configured.
 *
 * It implements just the subset of the supabase-js client that the API handlers use
 * (from/select with embedded relations, eq/in/order/range/limit, single/maybeSingle,
 * insert/update/upsert/delete, rpc, storage.upload) on top of a JSON file, and mirrors
 * the schema in supabase/migrations: same tables, defaults, unique keys, foreign keys
 * and the order/stock/cart SQL functions.
 *
 * Single process, data in .local-data/db.json, uploads in .local-data/uploads/.
 * Not for production.
 */

export const LOCAL_DIR = path.join(process.cwd(), ".local-data");
export const UPLOAD_DIR = path.join(LOCAL_DIR, "uploads");
const DB_FILE = path.join(LOCAL_DIR, "db.json");

// ------------------------------------------------------------------ schema

const now = () => new Date().toISOString();

/** Column defaults applied on insert (mirrors the SQL migration). */
const TABLES = {
  banners: {},
  contact_info: { updated: true },
  contact_messages: { updated: true },
  admins: { updated: true, defaults: { social_media: {} }, unique: [["email"]] },
  occasion_titles: {},
  occasion_categories: { defaults: { image: null, occasion_id: null } },
  occasion_products: {
    defaults: {
      discount: 0, offer_price: null, images: [], colors: [], sizes: [], status: false,
      stocks: 0, min_stocks: 0, stock_history: [], occasion_category_id: null,
    },
  },
  product_categories: {},
  product_subcategories: { defaults: { description: null, image: null, parent_category_id: null } },
  category_products: {
    updated: true,
    defaults: {
      discount: 0, images: [], colors: [], available_sizes: [], min_stocks: 0, status: false,
      size_chart: null, tag: null, fabric: null, description: null, additional_info: null,
      product_category_id: null, subcategory_id: null,
    },
  },
  product_size_stock: { noId: true, noTimestamp: true, defaults: { quantity: 0, min_quantity: 0 }, unique: [["product_id", "size"]] },
  product_stock_history: { timestamp: "added_at" },
  product_sizes: { unique: [["name"]] },
  product_colors: { unique: [["name"]] },
  product_fabrics: { unique: [["name"]] },
  product_tags: { unique: [["name"]] },
  users: {
    updated: true,
    unique: [["phone_number"]],
    defaults: {
      otp_hash: null, otp_expires_at: null, otp_attempts: 0, first_name: null, last_name: null,
      email: null, dob: null, gender: null, address: null, shipping_details: {},
    },
  },
  cart_items: { timestamp: "added_at", defaults: { quantity: 1 }, unique: [["user_id", "product_id", "size"]] },
  orders: {
    updated: true,
    defaults: {
      payment_method: "UPI", coupon_code: null, tax: 0, shipping_charge: 0, discount: 0,
      status: "pending", payment_status: "pending", tracking_number: null, shipping_address: null,
    },
  },
  payment_transactions: {
    updated: true,
    defaults: {
      amount: 0, transaction_id: null, transaction_status: "CR", pending_order: null,
      order_id: null, order_error: null, status: "InProgress",
    },
  },
};

/** Foreign keys: [table, column, referencedTable, onDelete]. */
const FKS = [
  ["occasion_categories", "occasion_id", "occasion_titles", "set null"],
  ["occasion_products", "occasion_category_id", "occasion_categories", "set null"],
  ["product_subcategories", "parent_category_id", "product_categories", "set null"],
  ["category_products", "product_category_id", "product_categories", "set null"],
  ["category_products", "subcategory_id", "product_subcategories", "set null"],
  ["product_size_stock", "product_id", "category_products", "cascade"],
  ["product_stock_history", "product_id", "category_products", "cascade"],
  ["cart_items", "user_id", "users", "cascade"],
  ["cart_items", "product_id", "category_products", "cascade"],
  ["orders", "user_id", "users", "set null"],
  ["payment_transactions", "user_id", "users", "set null"],
  ["payment_transactions", "order_id", "orders", "set null"],
];

// ------------------------------------------------------------------ storage of the data

class DbError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
const toError = (e) => ({ code: e.code ?? "LOCAL", message: e.message, details: null, hint: null });

function loadData() {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    /* first run */
  }
  for (const t of Object.keys(TABLES)) data[t] ??= [];
  return data;
}

const fileMtime = () => {
  try {
    return fs.statSync(DB_FILE).mtimeMs;
  } catch {
    return null;
  }
};

// One store per process, shared by every route bundle.
const store = (globalThis.__sbLocalStore ??= { data: loadData(), mtime: fileMtime() });

/**
 * Picks up outside changes: deleting .local-data resets the database, and hand edits
 * to db.json are loaded on the next request.
 */
function syncFromDisk() {
  const mtime = fileMtime();
  if (mtime !== store.mtime) {
    store.data = loadData();
    store.mtime = mtime;
  }
}

function persist() {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store.data, null, 2));
  fs.renameSync(tmp, DB_FILE);
  store.mtime = fileMtime();
}

/** Runs fn atomically: any throw restores the data as it was (like a transaction). */
function transaction(fn) {
  const snapshot = structuredClone(store.data);
  try {
    const result = fn(store.data);
    persist();
    return result;
  } catch (e) {
    store.data = snapshot;
    throw e;
  }
}

const rows = (table) => {
  if (!TABLES[table]) throw new DbError("42P01", `relation "public.${table}" does not exist`);
  return store.data[table];
};

// ------------------------------------------------------------------ constraints

function checkUnique(table, row, ignore) {
  for (const cols of TABLES[table].unique ?? []) {
    const clash = rows(table).find(
      (r) => r !== ignore && cols.every((c) => r[c] !== null && r[c] !== undefined && String(r[c]) === String(row[c]))
    );
    if (clash) {
      throw new DbError("23505", `duplicate key value violates unique constraint on ${table}(${cols.join(", ")})`);
    }
  }
}

function checkForeignKeys(table, row) {
  for (const [t, col, ref] of FKS) {
    if (t !== table || row[col] === null || row[col] === undefined) continue;
    if (!rows(ref).some((r) => r.id === row[col])) {
      throw new DbError("23503", `insert or update on ${table} violates foreign key ${col} -> ${ref}`);
    }
  }
}

function deleteRows(table, victims) {
  const ids = new Set(victims.map((r) => r.id));
  store.data[table] = rows(table).filter((r) => !victims.includes(r));
  for (const [t, col, ref, onDelete] of FKS) {
    if (ref !== table) continue;
    const dependents = rows(t).filter((r) => ids.has(r[col]));
    if (!dependents.length) continue;
    if (onDelete === "cascade") deleteRows(t, dependents);
    else for (const d of dependents) d[col] = null;
  }
}

function newRow(table, values) {
  const meta = TABLES[table];
  const stamp = now();
  const row = {
    ...(meta.noId ? {} : { id: crypto.randomUUID() }),
    ...structuredClone(meta.defaults ?? {}),
    ...(meta.noTimestamp ? {} : { [meta.timestamp ?? "created_at"]: stamp }),
    ...(meta.updated ? { updated_at: stamp } : {}),
  };
  for (const [k, v] of Object.entries(values)) if (v !== undefined) row[k] = structuredClone(v);
  return row;
}

function insertRow(table, values) {
  const row = newRow(table, values);
  checkUnique(table, row);
  checkForeignKeys(table, row);
  rows(table).push(row);
  return row;
}

function updateRow(table, row, patch) {
  const next = { ...row };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) next[k] = structuredClone(v);
  if (TABLES[table].updated && !("updated_at" in patch)) next.updated_at = now();
  checkUnique(table, next, row);
  checkForeignKeys(table, next);
  Object.assign(row, next);
  return row;
}

// ------------------------------------------------------------------ select / embedding

/** Parses "a, b, rel(*, sub(x))" into [{field} | {embed, spec}]. */
function parseSelect(spec = "*") {
  const out = [];
  let depth = 0, token = "";
  const flush = () => {
    const t = token.trim();
    token = "";
    if (!t) return;
    const m = /^([\w]+)\s*\((.*)\)$/s.exec(t);
    out.push(m ? { embed: m[1], spec: parseSelect(m[2]) } : { field: t });
  };
  for (const ch of spec) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) flush();
    else token += ch;
  }
  flush();
  return out;
}

function resolveEmbed(table, target) {
  const manyToOne = FKS.find(([t, , ref]) => t === table && ref === target);
  if (manyToOne) return { kind: "one", col: manyToOne[1] };
  const oneToMany = FKS.find(([t, , ref]) => t === target && ref === table);
  if (oneToMany) return { kind: "many", col: oneToMany[1] };
  throw new DbError("PGRST200", `Could not find a relationship between '${table}' and '${target}'`);
}

function project(table, row, spec, nestedOrders) {
  const out = {};
  for (const item of spec) {
    if (item.field === "*") Object.assign(out, structuredClone(row));
    else if (item.field) out[item.field] = structuredClone(row[item.field] ?? null);
  }
  for (const item of spec) {
    if (!item.embed) continue;
    const rel = resolveEmbed(table, item.embed);
    if (rel.kind === "one") {
      const target = rows(item.embed).find((r) => r.id === row[rel.col]);
      out[item.embed] = target ? project(item.embed, target, item.spec, nestedOrders) : null;
    } else {
      let children = rows(item.embed).filter((r) => r[rel.col] === row.id);
      const order = nestedOrders.find((o) => o.table === item.embed);
      if (order) children = sortRows(children, [order]);
      out[item.embed] = children.map((c) => project(item.embed, c, item.spec, nestedOrders));
    }
  }
  return out;
}

function sortRows(list, orders) {
  return [...list].sort((a, b) => {
    for (const { col, ascending } of orders) {
      const x = a[col], y = b[col];
      if (x === y) continue;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x < y ? -1 : 1) * (ascending ? 1 : -1);
    }
    return 0;
  });
}

// ------------------------------------------------------------------ query builder

class Query {
  constructor(table) {
    this.table = table;
    this.op = "select";
    this.filters = [];
    this.orders = [];
    this.nestedOrders = [];
    this.spec = null;
    this.returning = false;
  }

  select(spec = "*", opts = {}) {
    if (this.op === "select") {
      this.spec = parseSelect(spec);
      this.count = opts.count;
    } else {
      this.returning = true;
      this.spec = parseSelect(spec);
    }
    return this;
  }
  insert(values) { this.op = "insert"; this.payload = values; return this; }
  update(patch) { this.op = "update"; this.payload = patch; return this; }
  upsert(values, opts = {}) { this.op = "upsert"; this.payload = values; this.upsertOpts = opts; return this; }
  delete() { this.op = "delete"; return this; }

  eq(col, value) { this.filters.push((r) => r[col] !== null && r[col] !== undefined && String(r[col]) === String(value)); return this; }
  in(col, values) { const set = new Set(values.map(String)); this.filters.push((r) => set.has(String(r[col]))); return this; }

  order(col, { ascending = true, referencedTable } = {}) {
    if (referencedTable) this.nestedOrders.push({ table: referencedTable, col, ascending });
    else this.orders.push({ col, ascending });
    return this;
  }
  range(from, to) { this.rangeFrom = from; this.rangeTo = to; return this; }
  limit(n) { this.limitN = n; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }

  then(resolve, reject) {
    return Promise.resolve()
      .then(() => {
        syncFromDisk();
        return this.execute();
      })
      .then(resolve, reject);
  }

  matching() {
    return rows(this.table).filter((r) => this.filters.every((f) => f(r)));
  }

  shape(list, count) {
    const spec = this.spec ?? parseSelect("*");
    const data = list.map((r) => project(this.table, r, spec, this.nestedOrders));
    if (this.mode === "single" || this.mode === "maybe") {
      if (data.length > 1) return { data: null, error: toError(new DbError("PGRST116", "JSON object requested, multiple rows returned")) };
      if (data.length === 0 && this.mode === "single") {
        return { data: null, error: toError(new DbError("PGRST116", "JSON object requested, no rows returned")) };
      }
      return { data: data[0] ?? null, error: null, count };
    }
    return { data, error: null, count };
  }

  execute() {
    try {
      if (this.op === "select") {
        let list = sortRows(this.matching(), this.orders);
        const count = this.count ? list.length : null;
        if (this.rangeFrom !== undefined) list = list.slice(this.rangeFrom, this.rangeTo + 1);
        if (this.limitN !== undefined) list = list.slice(0, this.limitN);
        return this.shape(list, count);
      }

      const changed = transaction(() => {
        if (this.op === "insert") return [].concat(this.payload).map((v) => insertRow(this.table, v));
        if (this.op === "update") return this.matching().map((r) => updateRow(this.table, r, this.payload));
        if (this.op === "delete") {
          const victims = this.matching();
          deleteRows(this.table, victims);
          return victims;
        }
        // upsert
        const cols = (this.upsertOpts.onConflict ?? "id").split(",").map((c) => c.trim());
        const out = [];
        for (const v of [].concat(this.payload)) {
          const existing = rows(this.table).find((r) => cols.every((c) => String(r[c]) === String(v[c])));
          if (existing) {
            if (!this.upsertOpts.ignoreDuplicates) out.push(updateRow(this.table, existing, v));
          } else out.push(insertRow(this.table, v));
        }
        return out;
      });

      return this.returning ? this.shape(changed, null) : { data: null, error: null, count: null };
    } catch (e) {
      if (e instanceof DbError) return { data: null, error: toError(e) };
      throw e;
    }
  }
}

// ------------------------------------------------------------------ SQL functions (rpc)

const round2 = (n) => Math.round(n * 100) / 100;

function placeOrder(data, { p_user_id, p_items, p_address, p_payment_method, p_coupon_code }) {
  if (!Array.isArray(p_items) || p_items.length === 0) {
    throw new DbError("SB400", "Missing required fields: userId, items, or address");
  }
  let subtotal = 0;
  const lines = [];
  for (const item of p_items) {
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || !item.size) {
      throw new DbError("SB400", "Each item needs a size and a quantity of at least 1");
    }
    const product = data.category_products.find((p) => p.id === item.productId);
    if (!product) throw new DbError("SB404", `Product ${item.productId} not found`);
    const stock = data.product_size_stock.find((s) => s.product_id === product.id && s.size === item.size);
    if (!stock) throw new DbError("SB400", `Size ${item.size} not available for product ${product.name}`);
    if (stock.quantity < qty) {
      throw new DbError("SB400", `Not enough stock for ${product.name} (${item.size}). Available: ${stock.quantity}`);
    }
    stock.quantity -= qty;
    subtotal += Number(product.offer_price) * qty;
    lines.push({
      productId: product.id, size: item.size, quantity: qty, price: product.offer_price,
      name: product.name, image: product.images?.[0] ?? "",
    });
  }
  const tax = round2(subtotal * 0.18);
  const shipping = subtotal > 1000 ? 0 : 50;
  const discount = p_coupon_code === "SALE15" ? round2(subtotal * 0.15) : 0;
  return insertRow("orders", {
    user_id: p_user_id,
    items: lines,
    shipping_address: p_address,
    payment_method: p_payment_method || "UPI",
    coupon_code: p_coupon_code || null,
    subtotal: round2(subtotal),
    tax,
    shipping_charge: shipping,
    discount,
    total: round2(subtotal + tax + shipping - discount),
  });
}

const RPC = {
  place_order: (args) => transaction((data) => structuredClone(placeOrder(data, args))),

  finalize_payment: ({ p_txn_id }) => {
    const find = () => store.data.payment_transactions.find((t) => t.id === p_txn_id);
    if (!find()) throw new DbError("SB404", "Payment Id not found!");
    if (find().order_id || !find().pending_order) return structuredClone(find());
    try {
      transaction((data) => {
        const txn = find();
        const req = txn.pending_order;
        const order = placeOrder(data, {
          p_user_id: req.userId, p_items: req.items, p_address: req.address,
          p_payment_method: req.paymentMethod, p_coupon_code: req.couponCode,
        });
        order.payment_status = "completed";
        data.cart_items = data.cart_items.filter(
          (c) => !(c.user_id === req.userId && req.items.some((i) => i.productId === c.product_id && i.size === c.size))
        );
        updateRow("payment_transactions", txn, { order_id: order.id, pending_order: null, order_error: null });
      });
    } catch (e) {
      transaction(() => updateRow("payment_transactions", find(), { order_error: e.message }));
    }
    return structuredClone(find());
  },

  add_product_stock: ({ p_product_id, p_size, p_added, p_stock_name }) =>
    transaction((data) => {
      const product = data.category_products.find((p) => p.id === p_product_id);
      if (!product) throw new DbError("SB404", "Product not found");
      let stock = data.product_size_stock.find((s) => s.product_id === p_product_id && s.size === p_size);
      const prev = stock?.quantity ?? 0;
      const next = prev + p_added;
      if (next < 0) throw new DbError("SB400", `Stock cannot go below zero (current: ${prev})`);
      if (stock) stock.quantity = next;
      else insertRow("product_size_stock", { product_id: p_product_id, size: p_size, quantity: next, min_quantity: product.min_stocks ?? 0 });
      insertRow("product_stock_history", {
        product_id: p_product_id, size: p_size, stock_name: p_stock_name, added_stock: p_added, previous_stock: prev,
      });
      return next;
    }),

  add_to_cart: ({ p_user_id, p_product_id, p_size, p_quantity }) =>
    transaction((data) => {
      const line = data.cart_items.find((c) => c.user_id === p_user_id && c.product_id === p_product_id && c.size === p_size);
      if (line) line.quantity += p_quantity;
      else insertRow("cart_items", { user_id: p_user_id, product_id: p_product_id, size: p_size, quantity: p_quantity });
      return null;
    }),

  remove_from_cart: ({ p_user_id, p_product_id, p_size, p_remove_all }) =>
    transaction((data) => {
      const line = data.cart_items.find((c) => c.user_id === p_user_id && c.product_id === p_product_id && c.size === p_size);
      if (!line) return false;
      if (p_remove_all || line.quantity <= 1) data.cart_items = data.cart_items.filter((c) => c !== line);
      else line.quantity -= 1;
      return true;
    }),
};

// ------------------------------------------------------------------ client

export const localClient = {
  from: (table) => new Query(table),

  async rpc(name, args) {
    const fn = RPC[name];
    if (!fn) return { data: null, error: toError(new DbError("PGRST202", `function ${name} not found`)) };
    syncFromDisk();
    try {
      return { data: fn(args), error: null };
    } catch (e) {
      if (e instanceof DbError) return { data: null, error: toError(e) };
      throw e;
    }
  },

  storage: {
    from: () => ({
      async upload(filename, buffer) {
        if (filename.includes("/") || filename.includes("\\") || filename.startsWith(".")) {
          return { data: null, error: { message: "Invalid file name" } };
        }
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer, { flag: "wx" });
        return { data: { path: filename }, error: null };
      },
    }),
  },
};
