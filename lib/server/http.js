import "server-only";
import { NextResponse } from "next/server";
import { db, STORAGE_BUCKET } from "./supabase";

export class HttpError extends Error {
  constructor(status, body) {
    super(typeof body === "string" ? body : body?.error || body?.message || `HTTP ${status}`);
    this.status = status;
    this.body = typeof body === "string" ? { error: body } : body;
  }
}

export const json = (data, status = 200) => NextResponse.json(data, { status });

/**
 * Unwraps a Supabase result. Database errors raised by our SQL functions carry
 * SQLSTATE SB400/SB404 and are surfaced to the client; anything else is a 500.
 */
export function must({ data, error }, notFoundMessage) {
  if (error) {
    if (error.code === "SB404") throw new HttpError(404, { error: error.message });
    if (error.code === "SB400") throw new HttpError(400, { error: error.message });
    if (error.code === "23505") throw new HttpError(400, { error: "Already exists" });
    if (error.code === "22P02") throw new HttpError(400, { error: "Invalid id" });
    throw error;
  }
  if (notFoundMessage && (data === null || data === undefined)) {
    throw new HttpError(404, { error: notFoundMessage });
  }
  return data;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === "string" && UUID_RE.test(v);

/** Like Mongo's ObjectId cast: a malformed id simply matches nothing. */
export function requireId(value, message = "Invalid id") {
  if (!isUuid(value)) throw new HttpError(400, { error: message });
  return value;
}

/**
 * Parses JSON, urlencoded or multipart bodies into `{ body, files }`.
 * `files` keeps the order the browser sent them in, which the product forms rely on
 * (first file = size chart, the rest = product images) exactly as multer's upload.any() did.
 */
export async function readBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return { body: {}, files: [] };
  const type = req.headers.get("content-type") || "";

  if (type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    const body = {};
    const files = [];
    for (const [key, value] of form.entries()) {
      if (typeof value === "object" && value !== null && "arrayBuffer" in value) {
        if (value.size > 0) files.push({ field: key, file: value });
        continue;
      }
      if (key in body) body[key] = [].concat(body[key], value);
      else body[key] = value;
    }
    return { body, files };
  }

  const text = await req.text();
  if (!text) return { body: {}, files: [] };
  try {
    return { body: JSON.parse(text), files: [] };
  } catch {
    throw new HttpError(400, { error: "Invalid JSON body" });
  }
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = /^(image\/(png|jpe?g|webp|gif|avif|svg\+xml)|application\/pdf)$/;

/** Uploads to Supabase Storage and returns the stored filename (what the DB keeps). */
export async function uploadFile({ file }) {
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(400, { error: `${file.name} is larger than 10 MB` });
  if (file.type && !ALLOWED_TYPES.test(file.type)) {
    throw new HttpError(400, { error: `${file.name}: unsupported file type ${file.type}` });
  }
  const safeName = (file.name || "upload").replace(/[^\w.\-]+/g, "_").slice(-120);
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
  const { error } = await db()
    .storage.from(STORAGE_BUCKET)
    .upload(filename, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) throw error;
  return filename;
}

export const uploadAll = (files) => Promise.all(files.map(uploadFile));

/** Values from multipart forms arrive as strings. */
export const num = (v, fallback = undefined) => {
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const csv = (v) =>
  (Array.isArray(v) ? v : String(v ?? "").split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
