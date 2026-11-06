import { z } from "zod";
import { DELIVERY_AT_INPUT_MAX } from "../../leads/constants.ts";
import {
  ADDRESS_MAX,
  MESSAGE_MAX,
  NAME_MAX,
  PHONE_INPUT_MAX,
  normalizePhone,
  optionalText,
  type FieldErrorCode,
} from "../../leads/schema.ts";
import { formatPragueDateTime, parsePragueLocal } from "../../orders/prague-time.ts";
import { CITY_DELIVERY_FIELDS, CITY_DELIVERY_LABELS, DELIVERY_MODES } from "./constants.ts";
import type { FormKind, FormSummaryLine } from "./types.ts";

const UUID_INPUT_MAX = 64;

export type CityDeliveryValues = {
  pickupLocationId: string | null;
  pickupAddress: string | null;
  deliveryAddress: string;
  recipientName: string | null;
  recipientPhone: string | null;
  /** `null` — как можно скорее. */
  deliveryAt: Date | null;
  comment: string | null;
};

// Сообщения ошибок zod — это коды, тексты живут в компоненте. Правила полей — из lib/leads.
const schema = z
  .object({
    pickupLocationId: optionalText(UUID_INPUT_MAX).pipe(z.uuid({ error: "invalid" }).nullable()),
    pickupAddress: optionalText(ADDRESS_MAX),
    deliveryAddress: optionalText(ADDRESS_MAX),
    recipientName: optionalText(NAME_MAX),
    recipientPhone: optionalText(PHONE_INPUT_MAX),
    deliveryMode: z.enum(DELIVERY_MODES, { error: "invalid" }).default("asap"),
    deliveryAt: optionalText(DELIVERY_AT_INPUT_MAX),
    comment: optionalText(MESSAGE_MAX),
  })
  .transform((form, ctx): CityDeliveryValues => {
    const fail = (path: string, message: FieldErrorCode) =>
      ctx.addIssue({ code: "custom", message, path: [path] });

    if (!form.pickupLocationId && !form.pickupAddress) fail("pickupAddress", "required");
    if (!form.deliveryAddress) fail("deliveryAddress", "required");

    let recipientPhone: string | null = null;
    if (form.recipientPhone) {
      recipientPhone = normalizePhone(form.recipientPhone);
      if (!recipientPhone) fail("recipientPhone", "invalid");
    }

    let deliveryAt: Date | null = null;
    if (form.deliveryMode === "at") {
      if (!form.deliveryAt) {
        fail("deliveryAt", "required");
      } else {
        deliveryAt = parsePragueLocal(form.deliveryAt);
        if (!deliveryAt) fail("deliveryAt", "invalid");
      }
    }

    return {
      pickupLocationId: form.pickupLocationId,
      // Выбрана точка — адрес берётся из неё, введённый текст не используется.
      pickupAddress: form.pickupLocationId ? null : form.pickupAddress,
      deliveryAddress: form.deliveryAddress ?? "",
      recipientName: form.recipientName,
      recipientPhone,
      deliveryAt,
      comment: form.comment,
    };
  });

export const cityDelivery: FormKind<CityDeliveryValues> = {
  fields: CITY_DELIVERY_FIELDS,
  schema,
  // Строго: опечатка в `form_defaults` не должна молча отключать фиксированную точку забора.
  defaultsSchema: z.strictObject({
    pickupLocationId: z.uuid().optional(),
    pickupAddress: z.string().trim().min(1).max(ADDRESS_MAX).optional(),
  }),

  toTariffRequest(values, slotSlug) {
    return { slotSlug, locationId: values.pickupLocationId };
  },

  summarize(values, context) {
    const labels = CITY_DELIVERY_LABELS;
    const lines: FormSummaryLine[] = [
      { field: "pickup", label: labels.pickup, value: context.pickupLocationName ?? values.pickupAddress ?? "" },
      { field: "deliveryAddress", label: labels.deliveryAddress, value: values.deliveryAddress },
      {
        field: "deliveryTime",
        label: labels.deliveryTime,
        value: values.deliveryAt ? formatPragueDateTime(values.deliveryAt) : labels.asap,
      },
    ];
    if (values.recipientName) {
      lines.push({ field: "recipientName", label: labels.recipientName, value: values.recipientName });
    }
    if (values.recipientPhone) {
      lines.push({ field: "recipientPhone", label: labels.recipientPhone, value: values.recipientPhone });
    }
    if (values.comment) {
      lines.push({ field: "comment", label: labels.comment, value: values.comment });
    }
    return lines;
  },
};
