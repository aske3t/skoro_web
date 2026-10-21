import "server-only";

import { Bot } from "grammy";
import { registerCommands } from "./commands.ts";
import { registerLeadCallbacks } from "./lead-callbacks.ts";

/**
 * Серверless: экземпляр создаётся на каждый вызов (route handler) или один раз
 * при старте polling (bot:dev) — состояние бота не хранится между запросами.
 */
export function createBot(): Bot {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }

  const bot = new Bot(token);
  registerCommands(bot);
  registerLeadCallbacks(bot);

  // Без обработчика grammY при ошибке в хендлере останавливает polling, и бот «молчит».
  bot.catch((err) => {
    const error = err.error;
    console.error(
      `[telegram] update ${err.ctx.update.update_id} failed:`,
      error instanceof Error ? error.message : error,
    );
  });
  return bot;
}
