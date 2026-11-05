const BYPASS_PARAM = "x-vercel-protection-bypass";

/** Текст ошибки не содержит значения: в `APP_URL` может быть секрет обхода защиты. */
function parseAppUrl(appUrl: string): URL {
  let url: URL;
  try {
    url = new URL(appUrl);
  } catch {
    throw new Error("APP_URL не является адресом");
  }
  if (url.protocol !== "https:") throw new Error("APP_URL должен начинаться с https://");
  return url;
}

/**
 * Адрес вебхука: хост из `APP_URL` плюс только секрет обхода защиты Preview.
 * Параметр `x-vercel-set-bypass-cookie` нужен Mini App, но отвечает редиректом,
 * поэтому в адрес вебхука он не попадает.
 */
export function buildWebhookUrl(appUrl: string, path: string): string {
  const base = parseAppUrl(appUrl);
  const url = new URL(path, base.origin);
  const bypass = base.searchParams.get(BYPASS_PARAM);
  if (bypass) url.searchParams.set(BYPASS_PARAM, bypass);
  return url.toString();
}

/** Адрес для вывода в терминал: значения всех параметров скрыты. */
export function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const params = [...parsed.searchParams.keys()].map((key) => `${key}=***`);
    return `${parsed.origin}${parsed.pathname}${params.length ? `?${params.join("&")}` : ""}`;
  } catch {
    return "<нераспознанный адрес>";
  }
}
