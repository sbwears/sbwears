import "server-only";
import { db } from "../supabase";
import { HttpError, json, must, isUuid } from "../http";
import * as S from "../serialize";

// ------------------------------------------------------------------ store contact details

export async function createContact({ body }) {
  const { address, mobile, email } = body;
  if (!address || !mobile || !email) throw new HttpError(400, { error: "Address, mobile and email are required" });
  const existing = must(await db().from("contact_info").select("id").limit(1).maybeSingle());
  if (existing) {
    throw new HttpError(400, { error: "Contact details already exist. Please update instead." });
  }
  const row = must(await db().from("contact_info").insert({ address, mobile, email }).select().single());
  return json({ message: "Contact details created successfully", contact: S.contactInfo(row) }, 201);
}

export async function getContact() {
  const row = must(await db().from("contact_info").select().order("created_at").limit(1).maybeSingle());
  if (!row) throw new HttpError(404, { message: "No contact details found" });
  return json(S.contactInfo(row));
}

export async function updateContact({ params, body }) {
  if (!isUuid(params.id)) throw new HttpError(404, { error: "Contact not found" });
  const { address, mobile, email } = body;
  if (!address || !mobile || !email) throw new HttpError(400, { error: "Address, mobile and email are required" });
  const row = must(
    await db()
      .from("contact_info")
      .update({ address, mobile, email, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select()
      .maybeSingle()
  );
  if (!row) throw new HttpError(404, { error: "Contact not found" });
  return json({ message: "Contact details updated successfully", contact: S.contactInfo(row) });
}

// ------------------------------------------------------------------ "Contact us" messages

export async function createContactUs({ body }) {
  const pick = (k) => (typeof body[k] === "string" ? body[k].trim() : "");
  const message = { name: pick("name"), email: pick("email"), phone: pick("phone"), message: pick("message") };
  if (!message.name || !message.email || !message.phone || !message.message) {
    throw new HttpError(400, { error: "Name, email, phone and message are required." });
  }
  if (message.message.length > 5000) throw new HttpError(400, { error: "Message is too long." });
  must(await db().from("contact_messages").insert(message));
  return json({ message: "Contact message submitted successfully." }, 201);
}

export async function getAllContacts() {
  const rows = must(await db().from("contact_messages").select().order("created_at", { ascending: false }));
  return json(rows.map(S.contactMessage));
}
