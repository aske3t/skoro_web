import { createBot } from "../src/lib/telegram/bot.ts";

async function main() {
  const bot = createBot();
  await bot.api.setMyCommands([
    { command: "start", description: "Приветствие" },
    { command: "orders", description: "Заказы" },
    { command: "help", description: "Справка по командам" },
  ]);
  console.log("[bot:commands] Список команд обновлён.");
}

main().catch((error) => {
  console.error("[bot:commands] Ошибка:", error);
  process.exit(1);
});
