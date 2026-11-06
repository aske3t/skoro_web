import type { AdminClient } from "../supabase/admin.ts";
import { generateInviteToken, hashInviteToken, inviteExpiry, isInviteExpired } from "./invite.ts";

const UNIQUE_VIOLATION = "23505";

export type InviteContact = {
  id: string;
  name: string;
  clientName: string;
  linked: boolean;
};

/** Активные контакты активных клиентов для `/invite`. */
export async function listInviteContacts(db: AdminClient): Promise<InviteContact[]> {
  const { data, error } = await db
    .from("client_contacts")
    .select("id, name, telegram_user_id, clients!inner(name, status)")
    .eq("status", "active")
    .eq("clients.status", "active")
    .order("created_at");
  if (error) throw error;

  return data.map((contact) => ({
    id: contact.id,
    name: contact.name,
    clientName: contact.clients.name,
    linked: contact.telegram_user_id !== null,
  }));
}

export type CreateInviteResult =
  | { ok: true; token: string; contactName: string; clientName: string }
  | { ok: false; code: "unavailable" | "error" };

/** Новое приглашение заменяет старое. В БД только хэш токена (ADR-0006 §5). */
export async function createInvite(db: AdminClient, contactId: string, now: Date): Promise<CreateInviteResult> {
  const token = generateInviteToken();
  const { data, error } = await db
    .from("client_contacts")
    .update({
      invite_token_hash: hashInviteToken(token),
      invite_expires_at: inviteExpiry(now).toISOString(),
    })
    .eq("id", contactId)
    .eq("status", "active")
    .is("telegram_user_id", null)
    .select("name, clients!inner(name, status)")
    .maybeSingle();

  if (error) {
    console.error("[telegram] create invite failed:", error.message);
    return { ok: false, code: "error" };
  }
  if (!data || data.clients.status !== "active") return { ok: false, code: "unavailable" };
  return { ok: true, token, contactName: data.name, clientName: data.clients.name };
}

export type UnlinkResult = "unlinked" | "not_linked" | "error";

/** Кнопка «Отвязать» у админа. Старое приглашение тоже стирается. */
export async function unlinkContact(db: AdminClient, contactId: string): Promise<UnlinkResult> {
  const { data, error } = await db
    .from("client_contacts")
    .update({ telegram_user_id: null, invite_token_hash: null, invite_expires_at: null })
    .eq("id", contactId)
    .not("telegram_user_id", "is", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[telegram] unlink contact failed:", error.message);
    return "error";
  }
  return data ? "unlinked" : "not_linked";
}

export type RedeemResult =
  | { ok: true; contactName: string; clientName: string }
  | { ok: false; code: "invalid" | "error" };

/**
 * Вход по приглашению. Привязка условная: `telegram_user_id` пишется, только если поле ещё
 * пустое, а токен тот же, поэтому одна ссылка срабатывает один раз. Аккаунт, уже привязанный
 * к другому контакту, отсекает `unique` на `telegram_user_id`.
 */
export async function redeemInvite(
  db: AdminClient,
  token: string,
  telegramUserId: number,
  now: Date,
): Promise<RedeemResult> {
  const hash = hashInviteToken(token);

  const { data: contact, error: readError } = await db
    .from("client_contacts")
    .select("id, name, status, invite_expires_at, clients!inner(name, status)")
    .eq("invite_token_hash", hash)
    .maybeSingle();
  if (readError) {
    console.error("[telegram] redeem invite read failed:", readError.message);
    return { ok: false, code: "error" };
  }
  if (
    !contact ||
    !contact.invite_expires_at ||
    isInviteExpired(new Date(contact.invite_expires_at), now) ||
    contact.status !== "active" ||
    contact.clients.status !== "active"
  ) {
    return { ok: false, code: "invalid" };
  }

  const { data: linked, error: linkError } = await db
    .from("client_contacts")
    .update({ telegram_user_id: telegramUserId, invite_token_hash: null, invite_expires_at: null })
    .eq("id", contact.id)
    .eq("invite_token_hash", hash)
    .is("telegram_user_id", null)
    .select("id")
    .maybeSingle();
  if (linkError) {
    if (linkError.code === UNIQUE_VIOLATION) return { ok: false, code: "invalid" };
    console.error("[telegram] redeem invite link failed:", linkError.message);
    return { ok: false, code: "error" };
  }
  if (!linked) return { ok: false, code: "invalid" };

  return { ok: true, contactName: contact.name, clientName: contact.clients.name };
}

export type ClientContact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  clientId: string;
  clientName: string;
  paymentMethod: string;
};

/** Контакт, от имени которого можно заказывать. Заблокированный контакт или клиент — `null`. */
export async function findClientContact(db: AdminClient, telegramUserId: number): Promise<ClientContact | null> {
  const { data, error } = await db
    .from("client_contacts")
    .select("id, name, phone, email, status, clients!inner(id, name, status, default_payment_method)")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "active" || data.clients.status !== "active") return null;

  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    clientId: data.clients.id,
    clientName: data.clients.name,
    paymentMethod: data.clients.default_payment_method,
  };
}

/** `/logout`: клиент отвязывает себя сам. `false` — этот аккаунт не был привязан. */
export async function logoutContact(db: AdminClient, telegramUserId: number): Promise<boolean> {
  const { data, error } = await db
    .from("client_contacts")
    .update({ telegram_user_id: null })
    .eq("telegram_user_id", telegramUserId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
