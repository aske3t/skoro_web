import type { BotKind } from "../src/lib/telegram/bot-kind.ts";
import { parseAdminIds } from "../src/lib/telegram/permissions.ts";
import { errorText, selectBot } from "./telegram-select-bot.mts";

type Command = { command: string; description: string };

const COMMANDS: Record<BotKind, Command[]> = {
  service: [
    { command: "start", description: "Приветствие" },
    { command: "orders", description: "Заказы" },
    { command: "help", description: "Справка по командам" },
  ],
  client: [
    { command: "start", description: "Начать" },
    { command: "logout", description: "Отключить этот Telegram" },
  ],
};

// `/invite` видят только админы служебного бота, в своей личке (ADR-0006 §5).
const ADMIN_COMMANDS: Command[] = [{ command: "invite", description: "Приглашения клиентов" }];

async function main() {
  const { kind, bot } = selectBot(process.argv.slice(2));
  await bot.api.setMyCommands(COMMANDS[kind]);
  console.log(`[bot:commands] Список команд обновлён (${kind}).`);

  if (kind !== "service") return;

  for (const adminId of parseAdminIds(process.env.TELEGRAM_ADMIN_IDS)) {
    try {
      await bot.api.setMyCommands([...COMMANDS.service, ...ADMIN_COMMANDS], {
        scope: { type: "chat", chat_id: adminId },
      });
      console.log(`[bot:commands] Команды админа обновлены: ${adminId}.`);
    } catch (error) {
      // Telegram не знает чат, пока админ не написал боту. Остальным админам это не мешает.
      console.warn(`[bot:commands] Админ ${adminId} пропущен: ${errorText(error)}. Пусть напишет боту /start и запустите снова.`);
    }
  }
}

main().catch((error) => {
  console.error("[bot:commands] Ошибка:", errorText(error));
  process.exit(1);
});
