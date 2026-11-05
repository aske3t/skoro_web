import { maskUrl } from "../src/lib/telegram/app-url.ts";
import { isWebhookConfigured } from "../src/lib/telegram/webhook-guard.ts";
import { errorText, selectBot } from "./telegram-select-bot.mts";

async function main() {
  const { kind, bot } = selectBot(process.argv.slice(2));
  const info = await bot.api.getWebhookInfo();

  if (isWebhookConfigured(info)) {
    console.error(
      `[bot:dev] На боте уже установлен вебхук (${maskUrl(info.url ?? "")}).\n` +
        "Long polling снимет его и перехватит обновления у развёрнутого сайта.\n" +
        `Сначала снимите вебхук этого бота: npm run bot:webhook -- --bot ${kind} --delete`,
    );
    process.exit(1);
  }

  bot.start({
    allowed_updates: ["message", "callback_query"],
    onStart: () => console.log(`[bot:dev] Запущен long polling (${kind}). Ctrl+C — остановить.`),
  });
}

main().catch((error) => {
  console.error("[bot:dev] Ошибка запуска:", errorText(error));
  process.exit(1);
});
