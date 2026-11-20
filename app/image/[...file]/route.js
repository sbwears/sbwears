// Serves uploaded images in local mode. With Supabase configured, next.config.mjs
// redirects /image/* to Supabase Storage before this route is ever reached.
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/server/local-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".avif": "image/avif", ".svg": "image/svg+xml", ".pdf": "application/pdf",
};

export async function GET(_req, { params }) {
  const name = (await params).file?.join("/") ?? "";
  // Flat folder of generated names: refuse anything that could escape it.
  if (!name || name.includes("/") || name.includes("\\") || name.startsWith(".")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const body = await fs.readFile(path.join(UPLOAD_DIR, name));
    const type = TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream";
    return new Response(body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        ...(type === "image/svg+xml" && { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" }),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
