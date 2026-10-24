import { escapeHtml } from "../html.ts";
import { EMAIL_LOGO_CID, EMAIL_LOGO_HEIGHT, EMAIL_LOGO_WIDTH } from "./logo.ts";

/**
 * Письмо клиенту «заявка принята курьером». Языковых версий сайта пока нет (i18n — бэклог),
 * поэтому только чешский; новые языки добавляются в TEMPLATES, а язык будет браться
 * из версии сайта, с которой отправлена заявка.
 */
export type EmailLocale = "cs";

export type LeadTakenInput = {
  id: string;
  number: number | null;
  first_name: string | null;
  pickup_address: string | null;
  delivery_address: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  payment_method: string | null;
  message: string | null; // комментарий к доставке необязателен (P-36)
};

const SUPPORT_PHONE = "+420 795 402 571";
const SUPPORT_PHONE_HREF = "tel:+420795402571";
const MESSAGE_PREVIEW_MAX = 500;

// Цвета сайта. Вёрстка — таблицы и inline-стили: так её понимают Gmail, Outlook и Seznam.
const COLOR = {
  accent: "#b895ff",
  card: "#1f1526",
  panel: "#2a1e33",
  text: "#f4ede1",
  muted: "#b3a7bd",
  page: "#f3f0f6",
} as const;

const TEMPLATES = {
  cs: {
    subject: (number: string) => `Vaše objednávka č. ${number} byla přijata`,
    preheader: "Kurýr převzal vaši objednávku.",
    order: (number: string) => `Objednávka č. ${number}`,
    badge: "Přijato kurýrem",
    greeting: (name: string | null) => (name ? `Dobrý den, ${name},` : "Dobrý den,"),
    taken: (number: string) => `vaši objednávku č. ${number} převzal kurýr a pracuje na ní.`,
    summary: "Shrnutí doručení",
    pickup: "Vyzvednutí",
    delivery: "Doručení",
    recipientName: "Příjemce",
    recipientPhone: "Telefon příjemce",
    payment: "Platba",
    note: "Poznámka",
    paymentLabel: { cash: "Hotově", online: "Platba na webu" } as Record<string, string>,
    support: "Dotazy a podpora",
    call: "",
    signature: "SKORO u vás",
  },
} satisfies Record<EmailLocale, unknown>;

/** Номер для клиента: порядковый `leads.number`; для старых строк без него — начало uuid. */
export function leadNumber(lead: { id: string; number: number | null }): string {
  return lead.number !== null ? String(lead.number) : lead.id.slice(0, 8).toUpperCase();
}

function truncate(value: string, max: number): string {
  const chars = Array.from(value.trim());
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : chars.join("");
}

export function buildLeadTakenEmail(
  lead: LeadTakenInput,
  locale: EmailLocale = "cs",
): { subject: string; text: string; html: string } {
  const t = TEMPLATES[locale];
  const number = leadNumber(lead);
  const name = lead.first_name?.trim() || null;

  const rows: [string, string][] = [
    [t.pickup, lead.pickup_address ?? "—"],
    [t.delivery, lead.delivery_address ?? "—"],
    ...(lead.recipient_name ? [[t.recipientName, lead.recipient_name] as [string, string]] : []),
    ...(lead.recipient_phone ? [[t.recipientPhone, lead.recipient_phone] as [string, string]] : []),
    [
      t.payment,
      lead.payment_method ? (t.paymentLabel[lead.payment_method] ?? lead.payment_method) : "—",
    ],
    ...(lead.message?.trim()
      ? [[t.note, truncate(lead.message, MESSAGE_PREVIEW_MAX)] as [string, string]]
      : []),
  ];

  const text = [
    t.greeting(name),
    "",
    t.taken(number),
    "",
    `${t.summary}:`,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `${t.support}: ${SUPPORT_PHONE}`,
    "",
    t.signature,
  ].join("\n");

  const font = "font-family:Arial,Helvetica,sans-serif";
  const rowsHtml = rows
    .map(
      ([label, value]) => `
            <tr>
              <td style="${font};padding:6px 16px 6px 0;vertical-align:top;font-size:13px;color:${COLOR.accent};white-space:nowrap">${escapeHtml(label)}</td>
              <td style="${font};padding:6px 0;vertical-align:top;font-size:15px;line-height:1.45;color:${COLOR.text};white-space:pre-line">${escapeHtml(value)}</td>
            </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(t.subject(number))}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(t.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.page}">
  <tr>
    <td align="center" style="padding:32px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${COLOR.card};border:1px solid ${COLOR.accent};border-radius:20px">
        <tr>
          <td style="padding:32px 32px 8px">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="${font};background:${COLOR.accent};color:${COLOR.card};font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;padding:6px 12px;border-radius:999px">${escapeHtml(t.badge)}</td>
              </tr>
            </table>
            <h1 style="${font};margin:20px 0 0;font-size:28px;line-height:1.2;font-weight:bold;color:${COLOR.text}">${escapeHtml(t.order(number))}</h1>
          </td>
        </tr>
        <tr>
          <td style="${font};padding:16px 32px 0;font-size:15px;line-height:1.6;color:${COLOR.text}">
            <p style="margin:0 0 8px">${escapeHtml(t.greeting(name))}</p>
            <p style="margin:0">${escapeHtml(t.taken(number))}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.panel};border-radius:14px">
              <tr>
                <td style="padding:20px 20px 14px">
                  <div style="${font};font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${COLOR.muted};margin-bottom:8px">${escapeHtml(t.summary)}</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 0">
            <div style="${font};font-size:13px;color:${COLOR.muted};margin-bottom:10px">${escapeHtml(t.support)}</div>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:${COLOR.accent};border-radius:999px">
                  <a href="${SUPPORT_PHONE_HREF}" style="${font};display:inline-block;padding:12px 24px;font-size:15px;font-weight:bold;color:${COLOR.card};text-decoration:none">${escapeHtml(t.call)} ${SUPPORT_PHONE}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 0">
            <div style="height:1px;line-height:1px;font-size:1px;background:${COLOR.panel}">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 32px 32px">
            <img src="cid:${EMAIL_LOGO_CID}" width="${EMAIL_LOGO_WIDTH}" height="${EMAIL_LOGO_HEIGHT}" alt="${escapeHtml(t.signature)}" style="display:block;border:0;outline:none;${font};font-size:18px;font-weight:bold;color:${COLOR.text}">
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject: t.subject(number), text, html };
}
