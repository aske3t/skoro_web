"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PHOTO_MAX_BYTES } from "./constants";
import { LEAD_NOTIFICATION_COLUMNS, notifyNewLead } from "./notify";
import { checkPhoto, type PhotoUpload } from "./photo";
import {
  getFieldErrors,
  type FieldErrorCode,
  leadSchema,
  type LeadFormState,
  type LeadFormValues,
} from "./schema";
import {
  getClientIp,
  hashIp,
  isFilledTooFast,
  isRateLimited,
} from "./spam";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readValues(formData: FormData): LeadFormValues {
  return {
    kind: field(formData, "kind") === "question" ? "question" : "delivery",
    firstName: field(formData, "firstName"),
    lastName: field(formData, "lastName"),
    email: field(formData, "email"),
    phone: field(formData, "phone"),
    message: field(formData, "message"),
    pickupAddress: field(formData, "pickupAddress"),
    deliveryAddress: field(formData, "deliveryAddress"),
    recipientPhone: field(formData, "recipientPhone"),
    paymentMethod: field(formData, "paymentMethod"),
  };
}

/** Необязательное фото: пустой input — не ошибка. Тип проверяется по байтам. */
async function readPhoto(
  formData: FormData,
): Promise<{ photo?: PhotoUpload; error?: FieldErrorCode }> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return {};
  if (file.size > PHOTO_MAX_BYTES) return { error: "too_large" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkPhoto(bytes);
  if (!check.ok) return { error: check.code };
  return { photo: { bytes, type: check.type } };
}

export async function submitLead(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  // Боту отвечаем успехом, чтобы он не подбирал обход.
  if (field(formData, "website")) return { status: "success" };
  if (isFilledTooFast(field(formData, "elapsedMs"))) {
    return { status: "success" };
  }

  const values = readValues(formData);
  const parsed = leadSchema.safeParse({
    ...values,
    kind: formData.get("kind") ?? undefined,
    utm: field(formData, "utm"),
  });

  // Фото есть только у доставки; ошибку показываем вместе с ошибками остальных полей.
  const { photo, error: photoError } =
    values.kind === "delivery" ? await readPhoto(formData) : {};

  if (!parsed.success || photoError) {
    return {
      status: "error",
      code: "validation",
      fieldErrors: {
        ...(parsed.success ? {} : getFieldErrors(parsed.error)),
        ...(photoError ? { photo: photoError } : {}),
      },
      values,
    };
  }
  const lead = parsed.data;

  try {
    const ip = getClientIp(await headers());
    const ipHash = ip ? hashIp(ip) : null;
    const supabase = createAdminClient();

    if (ipHash && (await isRateLimited(supabase, ipHash))) {
      return { status: "error", code: "rate_limited", values };
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({
        kind: lead.kind,
        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        message: lead.message,
        pickup_address: lead.pickupAddress,
        delivery_address: lead.deliveryAddress,
        recipient_phone: lead.recipientPhone,
        payment_method: lead.paymentMethod,
        utm: lead.utm,
        ip_hash: ipHash,
      })
      .select(LEAD_NOTIFICATION_COLUMNS)
      .single();
    if (error) throw error;

    after(() => notifyNewLead(data, photo));
    return { status: "success" };
  } catch (error) {
    console.error("[leads] submit failed:", error);
    return { status: "error", code: "server_error", values };
  }
}
