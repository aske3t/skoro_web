import "server-only";

import { Bot } from "grammy";
import { registerClientCommands } from "./commands.ts";

/**
 * Клиентский бот (ADR-0006 §4). Как и служебный, создаётся на каждый вызов route handler
 * или один раз при старте polling: состояние между запросами не хранится.
 */
export function createClientBot(): Bot {
  const token = process.env.TELEGRAM_CLIENT_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_CLIENT_BOT_TOKEN is not set");
  }

  const bot = new Bot(token);
  registerClientCommands(bot);

  // Без обработчика grammY при ошибке в хендлере останавливает polling, и бот «молчит».
  bot.catch((err) => {
    const error = err.error;
    console.error(
      `[telegram:client] update ${err.ctx.update.update_id} failed:`,
      error instanceof Error ? error.message : error,
    );
  });
  return bot;
}
