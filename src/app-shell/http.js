"use client";

import axios from "axios";

// Every component calls the shared axios instance directly, so the API auth header is
// attached here once instead of in ~40 call sites. Admin screens send the admin token;
// everything else sends the shopper's token.

const isAdminScreen = () => window.location.pathname.startsWith("/admin");

const read = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

let installed = false;

export function installHttpAuth() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  axios.interceptors.request.use((config) => {
    const token = isAdminScreen() ? read("adminToken") : read("userToken");
    if (token && token !== "undefined" && !config.headers?.Authorization) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      const url = String(error?.config?.url ?? "");
      const sameOrigin = url.startsWith("/") || url.startsWith(window.location.origin);
      // A saved login whose account no longer exists (e.g. after switching databases)
      // is as stale as an expired one.
      const staleAccount = status === 404 && /\/api\/users\/user\/[^/]+$/.test(url);
      if ((status === 401 || staleAccount) && sameOrigin) {
        try {
          if (isAdminScreen()) {
            window.localStorage.removeItem("adminToken");
            if (window.location.pathname !== "/admin/login") window.location.assign("/admin/login");
          } else {
            // Expired or invalid shopper session: drop it so the UI shows "logged out".
            window.localStorage.removeItem("userToken");
            window.localStorage.removeItem("userId");
          }
        } catch {
          /* storage unavailable */
        }
      }
      return Promise.reject(error);
    }
  );
}
