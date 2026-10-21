/**
 * Нужно ли письмо клиенту «заявка принята». Чистая функция: решение только по данным из БД,
 * поэтому повтор после сбоя (Resend, падение бота, устаревшее нажатие) безопасен.
 */
export type ClientEmailState = "send" | "already_sent" | "not_applicable";

export function clientEmailState(lead: {
  kind: string;
  status: string;
  client_notified_at: string | null;
}): ClientEmailState {
  if (lead.kind !== "delivery" || lead.status !== "in_progress") return "not_applicable";
  return lead.client_notified_at ? "already_sent" : "send";
}
