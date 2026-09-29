import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const RATE_LIMIT_MAX_LEADS = 3;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const MIN_FILL_TIME_MS = 3000;

/** sha256(ip + LEAD_IP_SALT). Без соли не хэшируем: голый sha256 от IPv4 перебирается. */
export function hashIp(ip: string): string {
  const salt = process.env.LEAD_IP_SALT;
  if (!salt) throw new Error("LEAD_IP_SALT is not set");
  return createHash("sha256").update(ip + salt).digest("hex");
}

/** Первый адрес из x-forwarded-for, запасной вариант — x-real-ip. */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return headers.get("x-real-ip")?.trim() || null;
}

/**
 * Форма заполнена быстрее, чем может человек.
 * Нет метки (JS выключен) или метка из будущего (часы клиента спешат) — не блокируем.
 */
export function isFilledTooFast(startedAt: string, now: number): boolean {
  const started = Number(startedAt);
  if (!startedAt || !Number.isFinite(started)) return false;
  const elapsed = now - started;
  return elapsed >= 0 && elapsed < MIN_FILL_TIME_MS;
}

/** Лимит считается по БД: in-memory счётчики на serverless не глобальны. */
export async function isRateLimited(
  client: SupabaseClient<Database>,
  ipHash: string,
): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error } = await client
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (error) throw error;
  return (count ?? 0) >= RATE_LIMIT_MAX_LEADS;
}
