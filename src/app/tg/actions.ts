"use server";

import { loadClientOption } from "@/lib/orders/options";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveClientContact, type ClientContact } from "@/lib/telegram/contacts";
import { verifyInitData } from "@/lib/telegram/init-data";

export type MiniAppErrorCode =
  | "unauthorized"
  | "not_linked"
  | "client_inactive"
  | "option_unavailable"
  | "server_error";

export type OrderFormState =
  | { status: "ok"; clientName: string; optionName: string }
  | { status: "error"; code: MiniAppErrorCode };

type Authorized = { ok: true; contact: ClientContact } | { ok: false; code: MiniAppErrorCode };

/**
 * Кто открыл Mini App (ADR-0006 §4): подпись `initData` токеном клиентского бота, свежесть,
 * затем активный контакт активного клиента. Supabase-сессия не нужна.
 */
async function authorize(initData: unknown): Promise<Authorized> {
  const token = process.env.TELEGRAM_CLIENT_BOT_TOKEN;
  if (!token) {
    console.error("[tg] TELEGRAM_CLIENT_BOT_TOKEN is not set");
    return { ok: false, code: "server_error" };
  }

  const verified = verifyInitData(typeof initData === "string" ? initData : "", token, new Date());
  if (!verified.ok) return { ok: false, code: "unauthorized" };

  const resolved = await resolveClientContact(createAdminClient(), verified.user.id);
  return resolved.ok ? { ok: true, contact: resolved.contact } : { ok: false, code: resolved.code };
}

/** Данные для формы опции. На шаге 4 (часть 1) — только имя клиента и опции. */
export async function loadOrderForm(initData: string, clientOptionId: string): Promise<OrderFormState> {
  try {
    const auth = await authorize(initData);
    if (!auth.ok) return { status: "error", code: auth.code };

    const option = await loadClientOption(
      createAdminClient(),
      auth.contact.clientId,
      typeof clientOptionId === "string" ? clientOptionId : "",
    );
    if (!option) return { status: "error", code: "option_unavailable" };

    return { status: "ok", clientName: auth.contact.clientName, optionName: option.name };
  } catch (error) {
    console.error("[tg] load order form failed:", error instanceof Error ? error.message : error);
    return { status: "error", code: "server_error" };
  }
}
