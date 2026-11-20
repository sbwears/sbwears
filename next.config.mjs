// Same rule as dataBackend() in lib/server/supabase.js: Supabase only when fully configured.
const useSupabase =
  process.env.DATA_BACKEND === "supabase" ||
  (process.env.DATA_BACKEND !== "local" &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY));
const supabaseUrl = useSupabase ? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") : undefined;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "images";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the project root (a stray package-lock.json higher up confuses detection).
  turbopack: { root: import.meta.dirname },

  // PhonePe SDK is CommonJS with its own HTTP stack; keep it out of the server bundle.
  serverExternalPackages: ["pg-sdk-node"],

  // The UI stores bare filenames and renders them as /image/<file> (the old Express
  // static route). Those files now live in Supabase Storage, so send the browser there.
  // Local mode (no Supabase): old upload URLs are served by app/image/[...file]/route.js.
  async rewrites() {
    if (supabaseUrl) return [];
    return ["/Public/image/:file*", "/uploads/:file*"].map((source) => ({
      source,
      destination: "/image/:file*",
    }));
  },

  async redirects() {
    if (!supabaseUrl) return [];
    const target = `${supabaseUrl}/storage/v1/object/public/${bucket}/:file*`;
    return ["/image/:file*", "/Public/image/:file*", "/uploads/:file*"].map((source) => ({
      source,
      destination: target,
      permanent: false,
    }));
  },
};

export default nextConfig;
