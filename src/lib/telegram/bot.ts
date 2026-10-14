import "server-only";

import { Bot } from "grammy";
import { registerCommands } from "./commands.ts";

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
  return bot;
}
