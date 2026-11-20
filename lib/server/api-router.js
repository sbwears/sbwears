import "server-only";
import { HttpError, json, readBody } from "./http";
import { assertAccess, readAuth } from "./auth";

/**
 * Minimal Express-style router for a catch-all route handler. Each route is
 * `[METHOD, "/path/:param", accessLevel, handler]`; the first match wins, exactly like
 * the order of `router.get(...)` calls in the old Express route files.
 */
export function createRouter(routes) {
  const compiled = routes.map(([method, pattern, access, handler]) => {
    const keys = [];
    const source = pattern
      .split("/")
      .filter(Boolean)
      .map((seg) => {
        if (seg.startsWith(":")) {
          keys.push(seg.slice(1));
          return "([^/]+)";
        }
        return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    return { method, access, handler, keys, regex: new RegExp(`^/${source}/?$`) };
  });

  return async function dispatch(req, segments) {
    const path = "/" + (segments ?? []).map(encodeURIComponent).join("/");
    const pathMatches = compiled.filter((r) => r.regex.test(path));
    const route = pathMatches.find((r) => r.method === req.method);

    if (!route) {
      return pathMatches.length
        ? json({ error: "Method not allowed" }, 405)
        : json({ error: `Cannot ${req.method} ${new URL(req.url).pathname}` }, 404);
    }

    try {
      const values = route.regex.exec(path).slice(1);
      const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(values[i])]));
      const query = Object.fromEntries(new URL(req.url).searchParams);
      const auth = await readAuth(req);
      assertAccess(auth, route.access);
      const { body, files } = await readBody(req);
      return await route.handler({ req, params, query, body, files, auth });
    } catch (error) {
      if (error instanceof HttpError) return json(error.body, error.status);
      console.error(`[api] ${req.method} ${path} failed:`, error);
      return json({ error: "Internal Server Error" }, 500);
    }
  };
}

/** Wires a router into a Next.js `app/api/<prefix>/[...path]/route.js` file. */
export function routeHandlers(dispatch) {
  const handler = async (req, { params }) => dispatch(req, (await params).path);
  return { GET: handler, POST: handler, PUT: handler, PATCH: handler, DELETE: handler };
}
