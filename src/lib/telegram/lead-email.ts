import { buildLeadTakenEmail } from "../email/lead-taken.ts";
import { EMAIL_LOGO_CID, EMAIL_LOGO_PNG_BASE64 } from "../email/logo.ts";
import { sendEmail } from "../email/resend.ts";
import type { AdminClient } from "../supabase/admin.ts";
import { markClientNotified, type HandledLead } from "./lead-actions.ts";
import { clientEmailState } from "./lead-email-policy.ts";

export type ClientEmailResult = "sent" | "already_sent" | "not_applicable" | "failed";

/**
 * Письмо клиенту «заявка принята», если оно ещё не ушло (решение по `client_notified_at`).
 * Повторный вызов безопасен: БД не даст отправить дважды, а `Idempotency-Key` страхует
 * случай «письмо ушло, но отметка в БД не записалась».
 */
export async function sendClientEmailIfNeeded(
  db: AdminClient,
  lead: HandledLead,
): Promise<ClientEmailResult> {
  const state = clientEmailState(lead);
  if (state !== "send") return state;

  const sent = await sendEmail({
    to: lead.email,
    ...buildLeadTakenEmail(lead),
    idempotencyKey: `lead-taken/${lead.id}`,
    attachments: [
      { filename: "skoro.png", contentBase64: EMAIL_LOGO_PNG_BASE64, contentId: EMAIL_LOGO_CID },
    ],
  });
  if (!sent.ok) return "failed";

  if (!(await markClientNotified(db, lead.id, new Date()))) {
    console.error(`[telegram] email sent but client_notified_at not saved for lead ${lead.id}`);
  }
  return "sent";
}
