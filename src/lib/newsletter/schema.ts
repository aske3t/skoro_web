import { z } from "zod";
import { EMAIL_MAX } from "@/lib/leads/constants";

// Подписка на рассылку из футера (P-40). Тексты ошибок — в компоненте, здесь только коды.
export type NewsletterErrorCode =
  | "invalid_email"
  | "consent_required"
  | "rate_limited"
  | "server_error";

export type NewsletterState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; code: NewsletterErrorCode; email: string };

export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "invalid_email")
    .max(EMAIL_MAX, "invalid_email")
    .pipe(z.email({ error: "invalid_email" })),
  // Чекбокс согласия: браузер присылает "on", если отмечен.
  consent: z.literal("on", { error: "consent_required" }),
});

/** Первый код ошибки: сначала почта, потом согласие — в порядке полей формы. */
export function parseNewsletter(input: { email: string; consent: string }):
  | { ok: true; email: string }
  | { ok: false; code: NewsletterErrorCode } {
  const result = newsletterSchema.safeParse(input);
  if (result.success) return { ok: true, email: result.data.email };
  const issue = result.error.issues[0];
  return { ok: false, code: issue?.path[0] === "consent" ? "consent_required" : "invalid_email" };
}
