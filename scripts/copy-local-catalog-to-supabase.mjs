// Copies the CATALOGUE from the local dev store (.local-data) into Supabase:
// banners, categories, subcategories, products, stock, sizes/colours/fabrics/tags,
// occasions, plus every image they use.
//
// It never overwrites or deletes: rows whose id (or unique name) already exists in
// Supabase are skipped, and so are images already in the bucket. Customers, carts,
// orders, payments and contact messages are NOT copied.
//
// Usage:  node scripts/copy-local-catalog-to-supabase.mjs

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const bucket = env.SUPABASE_STORAGE_BUCKET || "images";
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const local = JSON.parse(fs.readFileSync(path.join(root, ".local-data", "db.json"), "utf8"));
const uploadDir = path.join(root, ".local-data", "uploads");

// Parents before children so foreign keys resolve.
const TABLES = [
  ["product_sizes", "name"],
  ["product_colors", "name"],
  ["product_fabrics", "name"],
  ["product_tags", "name"],
  ["banners", "id"],
  ["occasion_titles", "id"],
  ["occasion_categories", "id"],
  ["occasion_products", "id"],
  ["product_categories", "id"],
  ["product_subcategories", "id"],
  ["category_products", "id"],
  ["product_size_stock", "product_id,size"],
  ["product_stock_history", "id"],
];

// ---- images
const images = new Set();
const add = (v) => v && images.add(v);
for (const r of local.banners ?? []) add(r.image);
for (const r of local.occasion_categories ?? []) add(r.image);
for (const r of local.product_categories ?? []) add(r.image);
for (const r of local.product_subcategories ?? []) add(r.image);
for (const r of [...(local.category_products ?? []), ...(local.occasion_products ?? [])]) {
  add(r.size_chart);
  (r.images ?? []).forEach(add);
}

const { data: existing } = await db.storage.from(bucket).list("", { limit: 10000 });
const inBucket = new Set((existing ?? []).map((f) => f.name));
const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".pdf": "application/pdf" };

let uploaded = 0, skippedImages = 0;
for (const name of images) {
  if (inBucket.has(name)) { skippedImages++; continue; }
  const file = path.join(uploadDir, name);
  if (!fs.existsSync(file)) { console.warn(`  ! missing local image ${name}`); continue; }
  const { error } = await db.storage.from(bucket).upload(name, fs.readFileSync(file), {
    contentType: TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream",
    upsert: false,
  });
  if (error && !/exists/i.test(error.message)) throw new Error(`upload ${name}: ${error.message}`);
  uploaded++;
}
console.log(`images: ${uploaded} uploaded, ${skippedImages} already there`);

// ---- rows
for (const [table, conflict] of TABLES) {
  // Older local stores added created_at to stock rows; that table has no such column.
  const rows = (local[table] ?? []).map((r) =>
    table === "product_size_stock" ? (({ created_at, ...rest }) => rest)(r) : r
  );
  if (!rows.length) continue;
  const { data, error } = await db
    .from(table)
    .upsert(rows, { onConflict: conflict, ignoreDuplicates: true })
    .select(conflict.split(",")[0]);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`${table.padEnd(22)} ${data.length} added, ${rows.length - data.length} already there`);
}
console.log("done");
