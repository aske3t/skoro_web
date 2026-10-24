import { createBot } from "../src/lib/telegram/bot.ts";

// Вебхук ставится только на прод-домен: preview-адреса Vercel закрыты авторизацией,
// Telegram до них не достучится. Другой адрес можно передать первым аргументом.
const DEFAULT_URL = "https://skorouvas.cz/api/telegram/dispatch";
// Ограничение Telegram для secret_token: 1–256 символов A–Z, a–z, 0–9, «_» и «-».
const SECRET_RE = /^[A-Za-z0-9_-]{1,256}$/;
// Бот обрабатывает команды (message) и кнопки под заявками (callback_query).
const ALLOWED_UPDATES = ["message", "callback_query"] as const;

async function main() {
  const bot = createBot();
  const args = process.argv.slice(2);

  // Откат: снять вебхук, чтобы снова можно было запускать `npm run bot:dev`.
  if (args.includes("--delete")) {
    await bot.api.deleteWebhook();
    console.log("[bot:webhook] Вебхук снят.");
    return;
  }

  const url = args.find((a) => !a.startsWith("--")) ?? DEFAULT_URL;
  if (!url.startsWith("https://")) throw new Error(`Нужен https-адрес, получено: ${url}`);

  // Секрет должен совпадать с TELEGRAM_WEBHOOK_SECRET в Vercel (Production), иначе route ответит 401.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !SECRET_RE.test(secret)) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET не задан или содержит недопустимые символы");
  }

  await bot.api.setWebhook(url, {
    secret_token: secret,
    allowed_updates: [...ALLOWED_UPDATES],
    drop_pending_updates: true,
  });

  const info = await bot.api.getWebhookInfo();
  console.log(`[bot:webhook] Вебхук: ${info.url}`);
  console.log(`[bot:webhook] В очереди: ${info.pending_update_count}`);
  if (info.last_error_message) console.log(`[bot:webhook] Последняя ошибка: ${info.last_error_message}`);
}

main().catch((error) => {
  console.error("[bot:webhook] Ошибка:", error);
  process.exit(1);
});
