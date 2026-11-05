// Бизнес-время — Europe/Prague (ADR-0003 §6). Без зависимостей: только Intl.
const TIME_ZONE = "Europe/Prague";
const DAY_MS = 24 * 60 * 60 * 1000;

const PARTS_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const DISPLAY_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
});

function pragueParts(date: Date): Record<string, number> {
  const parts: Record<string, number> = {};
  for (const { type, value } of PARTS_FORMAT.formatToParts(date)) {
    if (type !== "literal") parts[type] = Number(value);
  }
  return parts;
}

/** Пражские часы на момент `date`, записанные как будто это UTC. */
function wallClockMs(date: Date): number {
  const p = pragueParts(date);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/**
 * Значение `datetime-local` → момент времени, считая его пражским, где бы ни был браузер.
 * - Несуществующее время (перевод часов вперёд, 02:30 в день перехода) → null.
 * - Время, которое бывает дважды (перевод назад) → первое из двух.
 * - Неверный формат или дата вроде 30 февраля → null.
 */
export function parsePragueLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;

  const [year, month, day, hour, minute, second] = match.slice(1).map((v) => Number(v ?? 0));
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(wall);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    return null;
  }

  // Смещение за сутки до и через сутки после различается только возле перевода часов.
  // Подходит то, что при обратном переводе даёт те же пражские часы.
  const instants = [wall - DAY_MS, wall + DAY_MS]
    .map((probe) => wall - (wallClockMs(new Date(probe)) - probe))
    .filter((instant) => wallClockMs(new Date(instant)) === wall);

  return instants.length > 0 ? new Date(Math.min(...instants)) : null;
}

/** Минуты от полуночи по Праге. */
export function pragueMinuteOfDay(date: Date): number {
  const { hour, minute } = pragueParts(date);
  return hour * 60 + minute;
}

/** Дата и время по Праге для Telegram и писем: «05.11.2026, 14:30». */
export function formatPragueDateTime(date: Date): string {
  return DISPLAY_FORMAT.format(date);
}
