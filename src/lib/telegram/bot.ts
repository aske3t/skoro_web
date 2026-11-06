import "server-only";

import { Bot } from "grammy";
import { createAdminClient } from "../supabase/admin.ts";
import { registerCommands } from "./commands.ts";
import { createInvite, listInviteContacts, unlinkContact } from "./contacts.ts";
import { registerInviteHandlers } from "./invite-handlers.ts";
import { registerLeadCallbacks } from "./lead-callbacks.ts";
import { registerUserTracking, touchTelegramUser } from "./telegram-users.ts";

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
  registerUserTracking(bot, (user) => touchTelegramUser(createAdminClient(), user));
  registerCommands(bot);
  // До кнопок заявок: те отвечают на все нажатия, которых не обработали раньше.
  registerInviteHandlers(bot, {
    listContacts: () => listInviteContacts(createAdminClient()),
    createInvite: (contactId) => createInvite(createAdminClient(), contactId, new Date()),
    unlink: (contactId) => unlinkContact(createAdminClient(), contactId),
    clientBotUsername: () => process.env.TELEGRAM_CLIENT_BOT_USERNAME,
  });
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
