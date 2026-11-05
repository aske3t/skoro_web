import type { BotKind } from "../src/lib/telegram/bot-kind.ts";
import { errorText, selectBot } from "./telegram-select-bot.mts";

const COMMANDS: Record<BotKind, { command: string; description: string }[]> = {
  service: [
    { command: "start", description: "Приветствие" },
    { command: "orders", description: "Заказы" },
    { command: "help", description: "Справка по командам" },
  ],
  client: [{ command: "start", description: "Начать" }],
};

async function main() {
  const { kind, bot } = selectBot(process.argv.slice(2));
  await bot.api.setMyCommands(COMMANDS[kind]);
  console.log(`[bot:commands] Список команд обновлён (${kind}).`);
}

main().catch((error) => {
  console.error("[bot:commands] Ошибка:", errorText(error));
  process.exit(1);
});
