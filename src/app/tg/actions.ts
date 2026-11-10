"use server";

import { after } from "next/server";
import { PHOTO_MAX_BYTES } from "@/lib/leads/constants";
import { checkPhoto, type PhotoUpload } from "@/lib/leads/photo";
import type { FieldErrorCode } from "@/lib/leads/schema";
import { getFormKind } from "@/lib/options/forms";
import { loadClientOption } from "@/lib/orders/options";
import { placeOrder, previewPrice, type OrderErrorCode, type OrderingContact } from "@/lib/orders/place-order";
import { loadClientLocations, saveOrderMessage, type ClientLocation } from "@/lib/orders/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveClientContact } from "@/lib/telegram/contacts";
import { verifyInitData } from "@/lib/telegram/init-data";
import { sendOrderCard, sendOrderReceived, sendTariffAlert } from "@/lib/telegram/order-messages";

export type MiniAppErrorCode =
  | "unauthorized"
  | "not_linked"
  | "client_inactive"
  | "option_unavailable"
  | "server_error";

export type OrderFormData = {
  clientName: string;
  optionName: string;
  formKind: string;
  paymentMethod: string;
  locations: ClientLocation[];
  defaults: { pickupLocationId?: string; pickupAddress?: string };
};

export type OrderFormState = { status: "ok"; form: OrderFormData } | { status: "error"; code: MiniAppErrorCode };

export type PricePreviewState =
  | { status: "ok"; total: number; slotLabel: string }
  | { status: "error"; code: MiniAppErrorCode | "invalid_time" | "slot_past" | "slot_outside_hours" | "tariff_invalid" };

export type SubmitOrderState =
  | { status: "ok"; number: number | null; total: number }
  | { status: "error"; code: MiniAppErrorCode | OrderErrorCode; fieldErrors?: Record<string, FieldErrorCode> };

type Authorized =
  | { ok: true; contact: OrderingContact; telegramUserId: number }
  | { ok: false; code: MiniAppErrorCode };

const log = (what: string) => (error: unknown) =>
  console.error(`[tg] ${what}:`, error instanceof Error ? error.message : error);

/**
 * Кто открыл Mini App (ADR-0006 §4): подпись `initData` токеном клиентского бота, свежесть,
 * затем активный контакт активного клиента. Supabase-сессия не нужна. Каждый action проверяет заново.
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
  if (!resolved.ok) return { ok: false, code: resolved.code };

  const { contact } = resolved;
  return {
    ok: true,
    telegramUserId: verified.user.id,
    contact: {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      clientId: contact.clientId,
      clientName: contact.clientName,
      paymentMethod: contact.paymentMethod,
    },
  };
}

const asString = (value: unknown) => (typeof value === "string" ? value : "");

/** Данные для формы опции: что заказываем, точки клиента, предзаполнение. */
export async function loadOrderForm(initData: string, clientOptionId: string): Promise<OrderFormState> {
  try {
    const auth = await authorize(initData);
    if (!auth.ok) return { status: "error", code: auth.code };

    const db = createAdminClient();
    const option = await loadClientOption(db, auth.contact.clientId, asString(clientOptionId));
    const form = option && getFormKind(option.formKind);
    if (!option || !form) return { status: "error", code: "option_unavailable" };

    const locations = await loadClientLocations(db, auth.contact.clientId);

    // Битое предзаполнение не мешает заказать: форма просто открывается пустой.
    const parsed = form.defaultsSchema.safeParse(option.formDefaults);
    if (!parsed.success) console.warn("[tg] form_defaults ignored for option", option.id);
    const defaults = (parsed.success ? parsed.data : {}) as OrderFormData["defaults"];
    if (defaults.pickupLocationId && !locations.some((l) => l.id === defaults.pickupLocationId)) {
      delete defaults.pickupLocationId;
    }

    return {
      status: "ok",
      form: {
        clientName: auth.contact.clientName,
        optionName: option.name,
        formKind: option.formKind,
        paymentMethod: auth.contact.paymentMethod,
        locations,
        defaults,
      },
    };
  } catch (error) {
    log("load order form failed")(error);
    return { status: "error", code: "server_error" };
  }
}

/** Цена и слот для формы — той же функцией тарифа, что и заказ. */
export async function previewOrderPrice(
  initData: string,
  clientOptionId: string,
  input: { deliveryMode: string; deliveryAt: string; pickupLocationId: string },
): Promise<PricePreviewState> {
  try {
    const auth = await authorize(initData);
    if (!auth.ok) return { status: "error", code: auth.code };

    const result = await previewPrice(createAdminClient(), {
      contact: auth.contact,
      clientOptionId: asString(clientOptionId),
      deliveryMode: asString(input?.deliveryMode),
      deliveryAt: asString(input?.deliveryAt),
      pickupLocationId: asString(input?.pickupLocationId),
      now: new Date(),
    });
    return result.ok
      ? { status: "ok", total: result.total, slotLabel: result.slotLabel }
      : { status: "error", code: result.code };
  } catch (error) {
    log("price preview failed")(error);
    return { status: "error", code: "server_error" };
  }
}

/** Необязательное фото: пустой input — не ошибка. Тип — по байтам (правило из lib/leads). */
async function readPhoto(formData: FormData): Promise<{ photo?: PhotoUpload; error?: FieldErrorCode }> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return {};
  if (file.size > PHOTO_MAX_BYTES) return { error: "too_large" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkPhoto(bytes);
  return check.ok ? { photo: { bytes, type: check.type } } : { error: check.code };
}

const SERVICE_FIELDS = new Set(["initData", "clientOptionId"]);

/**
 * Заказ из Mini App (ADR-0006 §6). После записи — карточка в группу от служебного бота
 * и «Заказ №N получен» от клиентского; их сбой заказ не отменяет.
 */
export async function submitOptionOrder(formData: FormData): Promise<SubmitOrderState> {
  try {
    const auth = await authorize(formData.get("initData"));
    if (!auth.ok) return { status: "error", code: auth.code };

    const { photo, error: photoError } = await readPhoto(formData);
    if (photoError) return { status: "error", code: "validation", fieldErrors: { photo: photoError } };

    const rawForm: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && !SERVICE_FIELDS.has(key)) rawForm[key] = value;
    }

    const db = createAdminClient();
    const result = await placeOrder(db, {
      contact: auth.contact,
      clientOptionId: asString(formData.get("clientOptionId")),
      rawForm,
      createdVia: "bot",
      now: new Date(),
    });

    if (!result.ok) {
      if (result.code === "tariff_invalid") {
        const optionName = result.optionName ?? "—";
        after(() => sendTariffAlert(auth.contact.clientName, optionName).catch(log("tariff alert failed")));
      }
      return { status: "error", code: result.code, fieldErrors: result.fieldErrors };
    }

    const { order } = result;
    after(async () => {
      try {
        const card = await sendOrderCard(order, photo);
        await saveOrderMessage(db, order.id, card.chatId, card.messageId);
      } catch (error) {
        // Повтор по правилу P-30 — шаг 5 (notifications). Пока заказ виден только в БД и в логе.
        log(`order card failed, order ${order.id}`)(error);
      }
      await sendOrderReceived(auth.telegramUserId, order.number).catch(log("order received message failed"));
    });

    return { status: "ok", number: order.number, total: order.total };
  } catch (error) {
    log("submit order failed")(error);
    return { status: "error", code: "server_error" };
  }
}
