"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, hashIp, isFilledTooFast } from "@/lib/leads/spam";
import { parseNewsletter, type NewsletterState } from "./schema";

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Подписка на рассылку (P-40). Тот же путь записи, что у заявок (ADR-0003):
 * zod на сервере, honeypot и time-trap, rate-limit по хэшу IP, запись через secret key.
 * Повторная подписка того же адреса не создаёт дубль и не раскрывает, что адрес уже есть.
 */
export async function subscribeNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const email = field(formData, "email");

  // Боты: заполненный honeypot или слишком быстрая отправка — молча «успех».
  if (field(formData, "website") || isFilledTooFast(field(formData, "elapsedMs"))) {
    return { status: "success" };
  }

  const parsed = parseNewsletter({ email, consent: field(formData, "consent") });
  if (!parsed.ok) return { status: "error", code: parsed.code, email };

  try {
    const supabase = createAdminClient();
    const ip = getClientIp(await headers());
    const ipHash = ip ? hashIp(ip) : null;

    if (ipHash) {
      const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { count, error } = await supabase
        .from("newsletter_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since);
      if (error) throw error;
      if ((count ?? 0) >= RATE_LIMIT_MAX) return { status: "error", code: "rate_limited", email };
    }

    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        { email: parsed.email, consented_at: new Date().toISOString(), ip_hash: ipHash },
        { onConflict: "email", ignoreDuplicates: true },
      );
    if (error) throw error;

    return { status: "success" };
  } catch (error) {
    console.error("[newsletter] subscribe failed", error);
    return { status: "error", code: "server_error", email };
  }
}
