import "server-only";

import { Bot } from "grammy";
import { listClientOptions } from "../../orders/options.ts";
import { createAdminClient } from "../../supabase/admin.ts";
import { buildAppUrl } from "../app-url.ts";
import { botApi } from "../bot-api.ts";
import { findClientContact, logoutContact, redeemInvite } from "../contacts.ts";
import { registerUserTracking, touchTelegramUser } from "../telegram-users.ts";
import { registerClientCommands, type LinkedNotice } from "./commands.ts";

/** Сообщение в группу от служебного бота. Без parse_mode: имена — данные, разметка им не нужна. */
async function notifyLinked(notice: LinkedNotice): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) throw new Error("TELEGRAM_CHAT_ID is not set");

  const account = notice.username ? `@${notice.username}` : `${notice.firstName} (id ${notice.telegramUserId})`;
  await botApi("service").sendMessage(
    chatId,
    `${notice.contactName} (${notice.clientName}) подключил Telegram: ${account}`,
  );
}

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
  registerUserTracking(bot, (user) => touchTelegramUser(createAdminClient(), user));
  registerClientCommands(bot, {
    findContact: (telegramUserId) => findClientContact(createAdminClient(), telegramUserId),
    redeemInvite: (inviteToken, telegramUserId) =>
      redeemInvite(createAdminClient(), inviteToken, telegramUserId, new Date()),
    logout: (telegramUserId) => logoutContact(createAdminClient(), telegramUserId),
    notifyLinked,
    listOrderOptions: (clientId) => listClientOptions(createAdminClient(), clientId),
    orderUrl: (clientOptionId) => {
      const appUrl = process.env.APP_URL;
      return appUrl ? buildAppUrl(appUrl, `/tg/order/${clientOptionId}`) : null;
    },
  });

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
