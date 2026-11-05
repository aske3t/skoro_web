import type { WebhookInfo } from "grammy/types";
import { buildWebhookUrl, maskUrl } from "../src/lib/telegram/app-url.ts";
import { BOT_CONFIG, type BotKind } from "../src/lib/telegram/bot-kind.ts";
import { leavesProdWebhook } from "../src/lib/telegram/webhook-guard.ts";
import { errorText, selectBot } from "./telegram-select-bot.mts";

// Ограничение Telegram для secret_token: 1–256 символов A–Z, a–z, 0–9, «_» и «-».
const SECRET_RE = /^[A-Za-z0-9_-]{1,256}$/;
// Боты обрабатывают команды (message) и кнопки (callback_query).
const ALLOWED_UPDATES = ["message", "callback_query"] as const;

function log(line: string): void {
  console.log(`[bot:webhook] ${line}`);
}

function printInfo(info: WebhookInfo): void {
  log(`Вебхук: ${info.url ? maskUrl(info.url) : "не установлен"}`);
  log(`В очереди: ${info.pending_update_count}`);
  if (info.last_error_message) {
    const when = info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : "дата неизвестна";
    log(`Последняя ошибка (${when}): ${info.last_error_message}`);
  } else {
    log("Последняя ошибка: нет");
  }
}

function webhookTarget(kind: BotKind): string {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL не задан. Для боевого бота: APP_URL=https://skorouvas.cz");
  return buildWebhookUrl(appUrl, BOT_CONFIG[kind].webhookPath);
}

function webhookSecret(kind: BotKind): string {
  const { secretEnv } = BOT_CONFIG[kind];
  const secret = process.env[secretEnv];
  if (!secret || !SECRET_RE.test(secret)) {
    throw new Error(`${secretEnv} не задан или содержит недопустимые символы`);
  }
  return secret;
}

async function main() {
  const args = process.argv.slice(2);
  const { kind, bot } = selectBot(args);

  const me = await bot.api.getMe();
  const info = await bot.api.getWebhookInfo();
  log(`Бот: @${me.username} (${kind})`);

  // Только чтение: показать, что за бот под этим токеном и куда смотрит его вебхук.
  if (args.includes("--info")) {
    printInfo(info);
    return;
  }

  const removing = args.includes("--delete");
  const target = removing ? null : webhookTarget(kind);

  if (leavesProdWebhook(info.url, target) && !args.includes("--force")) {
    throw new Error(
      `Вебхук @${me.username} стоит на боевом домене: похоже, это боевой бот. ` +
        "Проверьте токен в .env.local. Если действительно нужно увести его с прода, добавьте --force.",
    );
  }

  // Откат: снять вебхук, чтобы снова можно было запускать `npm run bot:dev`.
  if (target === null) {
    await bot.api.deleteWebhook();
    log("Вебхук снят.");
    return;
  }

  // Секрет должен совпадать со значением в Vercel, иначе маршрут ответит 401.
  await bot.api.setWebhook(target, {
    secret_token: webhookSecret(kind),
    allowed_updates: [...ALLOWED_UPDATES],
    drop_pending_updates: true,
  });

  printInfo(await bot.api.getWebhookInfo());
}

main().catch((error) => {
  console.error("[bot:webhook] Ошибка:", errorText(error));
  process.exit(1);
});
