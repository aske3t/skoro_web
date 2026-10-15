import { escapeHtml } from "../html.ts";
import type { LeadAction } from "./callback-data.ts";

const TIME_ZONE = "Europe/Prague";
const NAME_MAX = 200;

const handledAtFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
});

const ACTION_LABEL: Record<LeadAction, string> = {
  take: "✅ Взял в работу",
  spam: "🚫 Спам",
};

type TelegramUserName = {
  first_name: string;
  last_name?: string;
  username?: string;
};

/** Имя для БД и сообщения: «Имя Фамилия», иначе @username. Без HTML-экранирования. */
export function displayName(user: TelegramUserName): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  const name = full || (user.username ? `@${user.username}` : "без имени");
  return name.slice(0, NAME_MAX);
}

/** Строка под заявкой после обработки. Возвращает готовый HTML. */
export function formatHandledNote(action: LeadAction, name: string, at: Date): string {
  return `${ACTION_LABEL[action]}: <b>${escapeHtml(name)}</b> · ${handledAtFormatter.format(at)}`;
}
