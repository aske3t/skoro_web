/** Telegram user id админов из TELEGRAM_ADMIN_IDS (через запятую). Мусор пропускается. */
export function parseAdminIds(raw: string | undefined): Set<number> {
  const ids = new Set<number>();
  for (const part of (raw ?? "").split(",")) {
    const trimmed = part.trim();
    if (!/^\d+$/.test(trimmed)) continue;
    const id = Number(trimmed);
    if (Number.isSafeInteger(id) && id > 0) ids.add(id);
  }
  return ids;
}

export function isAdmin(userId: number | undefined, rawAdminIds: string | undefined): boolean {
  if (userId === undefined) return false;
  return parseAdminIds(rawAdminIds).has(userId);
}

/** Env читается при вызове, а не при загрузке модуля. */
export function isAdminFromEnv(userId: number | undefined): boolean {
  return isAdmin(userId, process.env.TELEGRAM_ADMIN_IDS);
}
