import { InlineKeyboard, type Bot, type Context } from "grammy";
import type { ClientOptionSummary } from "../../orders/options.ts";
import type { RecentOrder } from "../../orders/queries.ts";
import type { ClientContact, RedeemResult } from "../contacts.ts";
import { parseInviteStart } from "../invite.ts";
import { clientKeyboard, formatProfile, formatRecentOrders, guestKeyboard, MENU, TEXT } from "./texts.ts";

const INVITE_PREFIX = "inv_";

export type LinkedNotice = {
  contactName: string;
  clientName: string;
  username?: string;
  firstName: string;
  telegramUserId: number;
};

export type ClientDeps = {
  findContact: (telegramUserId: number) => Promise<ClientContact | null>;
  redeemInvite: (token: string, telegramUserId: number) => Promise<RedeemResult>;
  logout: (telegramUserId: number) => Promise<boolean>;
  notifyLinked: (notice: LinkedNotice) => Promise<void>;
  listOrderOptions: (clientId: string) => Promise<ClientOptionSummary[]>;
  /** Адрес формы опции; `null` — не задан `APP_URL`. */
  orderUrl: (clientOptionId: string) => string | null;
  listRecentOrders: (clientId: string) => Promise<RecentOrder[]>;
};

/** Сбой БД: клиент получает понятный ответ, а не молчание бота. */
async function safely(ctx: Context, handler: () => Promise<unknown>): Promise<void> {
  try {
    await handler();
  } catch (error) {
    console.error("[telegram:client] handler failed:", error instanceof Error ? error.message : error);
    await ctx.reply(TEXT.unavailable);
  }
}

/**
 * Клиентский бот (ADR-0006 §4, §5). Работает только в личке: сообщения из групп игнорируются,
 * даже если бота туда добавили. Роль определяется на каждое обновление: клиент или гость.
 * Админов этот бот не знает.
 */
export function registerClientCommands(bot: Bot, deps: ClientDeps): void {
  const chat = bot.chatType("private");

  async function replyWithMenu(ctx: Context, telegramUserId: number, text: string): Promise<void> {
    const contact = await deps.findContact(telegramUserId);
    await ctx.reply(text, { reply_markup: contact ? clientKeyboard() : guestKeyboard() });
  }

  async function redeem(ctx: Context, payload: string, from: NonNullable<Context["from"]>): Promise<void> {
    const token = parseInviteStart(payload);
    const result: RedeemResult = token ? await deps.redeemInvite(token, from.id) : { ok: false, code: "invalid" };

    if (!result.ok) {
      if (result.code === "error") throw new Error("invite redeem failed");
      await replyWithMenu(ctx, from.id, TEXT.inviteInvalid);
      return;
    }

    await ctx.reply(TEXT.greeting(result.clientName), { reply_markup: clientKeyboard() });

    // Вход уже состоялся: сбой сообщения в группу его не отменяет.
    try {
      await deps.notifyLinked({
        contactName: result.contactName,
        clientName: result.clientName,
        username: from.username,
        firstName: from.first_name,
        telegramUserId: from.id,
      });
    } catch (error) {
      console.error("[telegram:client] linked notice failed:", error instanceof Error ? error.message : error);
    }
  }

  chat.command("start", (ctx) =>
    safely(ctx, async () => {
      const payload = ctx.match;
      if (payload.startsWith(INVITE_PREFIX)) return redeem(ctx, payload, ctx.from);

      const contact = await deps.findContact(ctx.from.id);
      if (contact) {
        await ctx.reply(TEXT.greeting(contact.clientName), { reply_markup: clientKeyboard() });
      } else {
        await ctx.reply(TEXT.guestWelcome, { reply_markup: guestKeyboard() });
      }
    }),
  );

  chat.command("logout", (ctx) =>
    safely(ctx, async () => {
      const wasLinked = await deps.logout(ctx.from.id);
      await ctx.reply(wasLinked ? TEXT.logoutDone : TEXT.logoutGuest, { reply_markup: guestKeyboard() });
    }),
  );

  chat.hears(MENU.howToConnect, (ctx) => ctx.reply(TEXT.howToConnect));
  chat.hears([MENU.contactGuest, MENU.contactClient], (ctx) => ctx.reply(TEXT.contact));

  // Форма открывается только inline-кнопкой web_app: у кнопки reply-клавиатуры `initData` пуст,
  // а сам бот открыть Mini App не может — поэтому даже одна опция приходит кнопкой.
  chat.hears(MENU.newOrder, (ctx) =>
    safely(ctx, async () => {
      const contact = await deps.findContact(ctx.from.id);
      if (!contact) {
        await ctx.reply(TEXT.notConnected, { reply_markup: guestKeyboard() });
        return;
      }
      const options = await deps.listOrderOptions(contact.clientId);
      if (options.length === 0) {
        await ctx.reply(TEXT.noOptions);
        return;
      }
      const keyboard = new InlineKeyboard();
      for (const option of options) {
        const url = deps.orderUrl(option.id);
        if (!url) throw new Error("APP_URL is not set");
        keyboard.webApp(option.name, url).row();
      }
      await ctx.reply(TEXT.newOrder, { reply_markup: keyboard });
    }),
  );

  chat.hears(MENU.myOrders, (ctx) =>
    safely(ctx, async () => {
      const contact = await deps.findContact(ctx.from.id);
      if (!contact) {
        await ctx.reply(TEXT.notConnected, { reply_markup: guestKeyboard() });
        return;
      }
      await ctx.reply(formatRecentOrders(await deps.listRecentOrders(contact.clientId)));
    }),
  );

  chat.hears(MENU.profile, (ctx) =>
    safely(ctx, async () => {
      const contact = await deps.findContact(ctx.from.id);
      if (contact) await ctx.reply(formatProfile(contact));
      else await ctx.reply(TEXT.notConnected, { reply_markup: guestKeyboard() });
    }),
  );

  chat.on("message", (ctx) => safely(ctx, () => replyWithMenu(ctx, ctx.from.id, TEXT.chooseFromMenu)));
}
