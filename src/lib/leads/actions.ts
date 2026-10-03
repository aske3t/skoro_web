"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNewLead } from "./notify";
import {
  getFieldErrors,
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
  };
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
  if (!parsed.success) {
    return {
      status: "error",
      code: "validation",
      fieldErrors: getFieldErrors(parsed.error),
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
        utm: lead.utm,
        ip_hash: ipHash,
      })
      .select("id, created_at, kind, first_name, last_name, email, phone, message, utm")
      .single();
    if (error) throw error;

    after(() => notifyNewLead(data));
    return { status: "success" };
  } catch (error) {
    console.error("[leads] submit failed:", error);
    return { status: "error", code: "server_error", values };
  }
}
