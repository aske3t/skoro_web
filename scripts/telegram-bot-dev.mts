import { createBot } from "../src/lib/telegram/bot.ts";
import { isWebhookConfigured } from "../src/lib/telegram/webhook-guard.ts";

async function main() {
  const bot = createBot();
  const info = await bot.api.getWebhookInfo();

  if (isWebhookConfigured(info)) {
    console.error(
      `[bot:dev] На боте уже установлен вебхук (${info.url}).\n` +
        "Long polling снимет его и перехватит обновления у прода.\n" +
        "Для локальной разработки после релиза нужен отдельный dev-бот (свой токен).",
    );
    process.exit(1);
  }

  bot.start({
    allowed_updates: ["message", "callback_query"],
    onStart: () => console.log("[bot:dev] Запущен long polling. Ctrl+C — остановить."),
  });
}

main().catch((error) => {
  console.error("[bot:dev] Ошибка запуска:", error);
  process.exit(1);
});
