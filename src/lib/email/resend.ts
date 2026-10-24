import "server-only";

const RESEND_URL = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 10000;

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Inline-картинки: в HTML на них ссылаются как `cid:<contentId>`. */
  attachments?: { filename: string; contentBase64: string; contentId: string }[];
  /** Resend не отправит повторно письмо с тем же ключом (24 ч): защита от повторов. */
  idempotencyKey: string;
};

export type SendEmailResult = { ok: true } | { ok: false; code: "not_configured" | "failed" };

/** Отправка через Resend HTTP API, без SDK. Env читаются при вызове. Никогда не бросает. */
export async function sendEmail(email: Email): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO;
  if (!apiKey || !from) {
    console.warn("[email] RESEND_API_KEY / EMAIL_FROM not set, skipping email");
    return { ok: false, code: "not_configured" };
  }

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": email.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.attachments?.length
          ? {
              attachments: email.attachments.map((a) => ({
                filename: a.filename,
                content: a.contentBase64,
                content_id: a.contentId,
              })),
            }
          : {}),
      }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[email] Resend ${response.status}: ${body.slice(0, 200)}`);
      return { ok: false, code: "failed" };
    }
    return { ok: true };
  } catch (error) {
    console.error("[email] send failed:", error instanceof Error ? error.message : error);
    return { ok: false, code: "failed" };
  }
}
