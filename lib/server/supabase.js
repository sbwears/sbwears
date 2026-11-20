import "server-only";
import { createClient } from "@supabase/supabase-js";
import { localClient } from "./local-db";

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "images";

/**
 * "supabase" when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set,
 * otherwise "local" (JSON file in .local-data/). DATA_BACKEND=local|supabase overrides.
 */
export function dataBackend() {
  const forced = process.env.DATA_BACKEND;
  if (forced === "local" || forced === "supabase") return forced;
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local";
}

let client;

/** Server-side database client. The Supabase one uses the service role and bypasses RLS. */
export function db() {
  if (client) return client;

  if (dataBackend() === "local") {
    console.warn("[db] Supabase is not configured — using the local file database in .local-data/");
    client = localClient;
    return client;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("DATA_BACKEND=supabase but NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing");
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
