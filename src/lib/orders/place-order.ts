import type { Json } from "@/types/database";
import type { FieldErrorCode } from "../leads/schema.ts";
import { getFormFieldErrors, getFormKind, type FormSummaryLine } from "../options/forms/index.ts";
import { quoteTariff, type TariffRequest } from "../pricing/tariffs/index.ts";
import type { Quote } from "../pricing/types.ts";
import type { AdminClient } from "../supabase/admin.ts";
import { loadClientOption, type ClientOption } from "./options.ts";
import { parsePragueLocal } from "./prague-time.ts";
import { loadClientLocations, loadSlotData, type ClientLocation } from "./queries.ts";
import { pickSlotAsap, pickSlotForTime } from "./slot.ts";

// Логика заказа по опции (ADR-0006 §6). Каналы — Mini App, позже кабинет — передают уже проверенный
// контакт: здесь нет ничего о Telegram.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SQL_CODES = ["not_linked", "client_inactive", "option_unavailable"] as const;

export type OrderingContact = {
  id: string;
  name: string;
  phone: string | null;
  clientId: string;
  clientName: string;
  paymentMethod: string;
};

type PriceCode = "slot_past" | "slot_outside_hours" | "tariff_invalid" | "server_error";

export type OrderErrorCode =
  | PriceCode
  | "option_unavailable"
  | "validation"
  | "invalid_time"
  | "not_linked"
  | "client_inactive";

type Priced =
  | { ok: true; quote: Quote; slot: { id: string; slug: string; label: string } }
  | { ok: false; code: PriceCode };

/** Слот по времени (Europe/Prague) и цена по тарифу опции — одна функция для превью и заказа. */
async function priceOption(
  db: AdminClient,
  option: ClientOption,
  deliveryAt: Date | null,
  now: Date,
  request: (slotSlug: string) => TariffRequest,
): Promise<Priced> {
  const slotData = await loadSlotData(db);
  if (!slotData) return { ok: false, code: "server_error" };

  const picked = deliveryAt
    ? pickSlotForTime(now, deliveryAt, slotData.slots, slotData.hours)
    : pickSlotAsap(now, slotData.slots, slotData.hours);
  if (!picked.ok) {
    if (picked.code !== "no_slot") return { ok: false, code: picked.code };
    console.error("[orders] no delivery slot fits", { deliveryAt: deliveryAt?.toISOString() ?? "asap" });
    return { ok: false, code: "server_error" };
  }

  const tariff = quoteTariff(option.tariffKind, option.tariffParams, request(picked.slot.slug), {
    slots: slotData.slots,
    optionName: option.name,
  });
  if (!tariff.ok) return { ok: false, code: "tariff_invalid" };
  return { ok: true, quote: tariff.quote, slot: picked.slot };
}

export type PreviewInput = {
  contact: OrderingContact;
  clientOptionId: string;
  deliveryMode: string;
  deliveryAt: string;
  pickupLocationId: string;
  now: Date;
};

export type PreviewResult =
  | { ok: true; total: number; slotLabel: string }
  | { ok: false; code: PriceCode | "option_unavailable" | "invalid_time" };

/**
 * Превью цены для формы. Принадлежность точки не проверяется: в `byLocation` есть только точки
 * этого клиента, чужая точка просто даст цену по умолчанию. Заказ проверяет точку строго.
 */
export async function previewPrice(db: AdminClient, input: PreviewInput): Promise<PreviewResult> {
  const option = await loadClientOption(db, input.contact.clientId, input.clientOptionId);
  if (!option) return { ok: false, code: "option_unavailable" };

  let deliveryAt: Date | null = null;
  if (input.deliveryMode === "at") {
    deliveryAt = parsePragueLocal(input.deliveryAt);
    if (!deliveryAt) return { ok: false, code: "invalid_time" };
  }
  const locationId = UUID_RE.test(input.pickupLocationId) ? input.pickupLocationId.toLowerCase() : null;

  const priced = await priceOption(db, option, deliveryAt, input.now, (slotSlug) => ({ slotSlug, locationId }));
  if (!priced.ok) return priced;
  return { ok: true, total: priced.quote.total, slotLabel: priced.slot.label };
}

export type PlaceOrderInput = {
  contact: OrderingContact;
  clientOptionId: string;
  rawForm: Record<string, string>;
  createdVia: "bot" | "web";
  now: Date;
};

/** Всё, что нужно уведомлениям о новом заказе. */
export type PlacedOrder = {
  id: string;
  number: number | null;
  optionName: string;
  clientName: string;
  contactName: string;
  contactPhone: string | null;
  summary: FormSummaryLine[];
  slotLabel: string;
  total: number;
  paymentMethod: string;
};

export type PlaceOrderResult =
  | { ok: true; order: PlacedOrder }
  | { ok: false; code: OrderErrorCode; fieldErrors?: Record<string, FieldErrorCode>; optionName?: string };

/**
 * Заказ: опция клиента → форма → точка клиента → слот → тариф → `create_option_order`.
 * Сумма из браузера не принимается: цену считает сервер (ADR-0004).
 */
export async function placeOrder(db: AdminClient, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const { contact } = input;

  const option = await loadClientOption(db, contact.clientId, input.clientOptionId);
  const form = option && getFormKind(option.formKind);
  if (!option || !form) return { ok: false, code: "option_unavailable" };

  const parsed = form.schema.safeParse(input.rawForm);
  if (!parsed.success) return { ok: false, code: "validation", fieldErrors: getFormFieldErrors(parsed.error) };
  const values = parsed.data;

  let location: ClientLocation | null = null;
  const locationId = form.pickupLocationId(values);
  if (locationId) {
    location = (await loadClientLocations(db, contact.clientId)).find((l) => l.id === locationId) ?? null;
    if (!location) return { ok: false, code: "validation", fieldErrors: { pickupLocationId: "invalid" } };
  }

  const deliveryAt = form.deliveryAt(values);
  const priced = await priceOption(db, option, deliveryAt, input.now, (slotSlug) =>
    form.toTariffRequest(values, slotSlug),
  );
  if (!priced.ok) return { ok: false, code: priced.code, optionName: option.name };

  const columns = form.orderColumns(values, { pickupAddress: location?.address ?? null });
  const formData = {
    ...(form.snapshot(values) as Record<string, Json | undefined>),
    pickupLocation: location,
    slot: { slug: priced.slot.slug, label: priced.slot.label },
    paymentMethod: contact.paymentMethod,
  };

  const { data, error } = await db.rpc("create_option_order", {
      p_contact_id: contact.id,
      p_client_option_id: option.id,
      p_created_via: input.createdVia,
      p_form_data: formData,
      p_price: priced.quote.total,
      p_price_breakdown: priced.quote as unknown as Json,
      p_tariff_kind: option.tariffKind,
      p_slot_id: priced.slot.id,
      p_from_address: columns.fromAddress,
      p_to_address: columns.toAddress,
      p_scheduled_for: deliveryAt?.toISOString(),
      p_recipient_contact: columns.recipientContact ?? undefined,
      p_comment: columns.comment ?? undefined,
    });

  if (error) {
    const code = SQL_CODES.find((c) => c === error.message);
    if (code) return { ok: false, code };
    console.error("[orders] create_option_order failed:", error.message);
    return { ok: false, code: "server_error" };
  }

  return {
    ok: true,
    order: {
      id: data.id,
      number: data.number,
      optionName: option.name,
      clientName: contact.clientName,
      contactName: contact.name,
      contactPhone: contact.phone,
      summary: form.summarize(values, {
        pickupLocationName: location ? `${location.name}, ${location.address}` : null,
      }),
      slotLabel: priced.slot.label,
      total: priced.quote.total,
      paymentMethod: contact.paymentMethod,
    },
  };
}
