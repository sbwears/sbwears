import "server-only";
import { HttpError } from "./http";

/**
 * When OTP_DEV_MODE=true the code is returned to the browser instead of being texted
 * (this is how the old backend behaved). Never enable it in production: anyone could
 * then sign in as any phone number.
 */
export const otpDevMode = () => process.env.OTP_DEV_MODE === "true";

/** Sends the OTP via Twilio's REST API (Twilio was already a dependency of the old backend). */
export async function sendOtpSms(phoneNumber, otp) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    console.error("OTP requested but no SMS provider is configured (TWILIO_* env vars missing)");
    throw new HttpError(503, { error: "OTP service is not available right now" });
  }

  const countryCode = process.env.OTP_DEFAULT_COUNTRY_CODE || "+91";
  const to = phoneNumber.startsWith("+") ? phoneNumber : `${countryCode}${phoneNumber}`;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: `Your SB Wears login code is ${otp}. It expires in 5 minutes.` }),
  });
  if (!res.ok) {
    console.error("Twilio SMS failed", res.status, await res.text().catch(() => ""));
    throw new HttpError(502, { error: "Failed to send OTP" });
  }
}
