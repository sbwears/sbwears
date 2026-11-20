import "server-only";
import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { HttpError } from "./http";

const TOKEN_TTL = "7d";

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

const sign = (claims) =>
  new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(TOKEN_TTL).sign(secret());

export const signAdminToken = (email) => sign({ role: "admin", email });
export const signUserToken = (user) =>
  sign({ role: "user", userId: user.id, phoneNumber: user.phone_number });

/** Returns `{ role: "admin" | "user" | "anon", userId?, email? }` from the Bearer token. */
export async function readAuth(req) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token || token === "undefined" || token === "null") return { role: "anon" };
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (payload.role === "admin") return { role: "admin", email: payload.email };
    if (payload.role === "user" && payload.userId) return { role: "user", userId: payload.userId };
  } catch {
    /* expired / tampered */
  }
  return { role: "invalid" };
}

export function assertAccess(auth, level) {
  if (level === "public") return;
  if (auth.role === "admin") return;
  if (level === "user" && auth.role === "user") return;
  if (auth.role === "anon" || auth.role === "invalid") {
    throw new HttpError(401, { error: "Not authorized, please log in" });
  }
  throw new HttpError(403, { error: "Admin access required" });
}

/** Shoppers may only touch their own records; admins may touch any. */
export function assertSelf(auth, userId) {
  if (auth.role === "admin") return;
  if (auth.role === "user" && userId && String(auth.userId) === String(userId)) return;
  throw new HttpError(403, { error: "You can only access your own account" });
}

export function checkAdminCredentials(email, password) {
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set");
  }
  const same = (a, b) => {
    const ha = crypto.createHash("sha256").update(String(a ?? "")).digest();
    const hb = crypto.createHash("sha256").update(String(b ?? "")).digest();
    return crypto.timingSafeEqual(ha, hb);
  };
  // Evaluate both so timing doesn't reveal which one was wrong.
  const emailOk = same(String(email ?? "").toLowerCase(), expectedEmail.toLowerCase());
  const passwordOk = same(password, expectedPassword);
  return emailOk && passwordOk;
}

export const hashOtp = (phoneNumber, otp) =>
  crypto.createHmac("sha256", secret()).update(`${phoneNumber}:${otp}`).digest("hex");

export const generateOtp = () => String(crypto.randomInt(1000, 10000));

export function otpMatches(storedHash, phoneNumber, otp) {
  if (!storedHash) return false;
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(hashOtp(phoneNumber, otp), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
