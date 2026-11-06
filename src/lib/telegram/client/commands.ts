import type { Bot, Context } from "grammy";
import type { ClientContact, RedeemResult } from "../contacts.ts";
import { parseInviteStart } from "../invite.ts";
import { clientKeyboard, formatProfile, guestKeyboard, MENU, TEXT } from "./texts.ts";

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

  chat.hears([MENU.newOrder, MENU.myOrders], (ctx) =>
    safely(ctx, async () => {
      const contact = await deps.findContact(ctx.from.id);
      if (contact) await ctx.reply(TEXT.comingSoon);
      else await ctx.reply(TEXT.notConnected, { reply_markup: guestKeyboard() });
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
