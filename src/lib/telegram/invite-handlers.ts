import { InlineKeyboard, type Bot, type Context } from "grammy";
import type { CreateInviteResult, InviteContact, UnlinkResult } from "./contacts.ts";
import { buildInviteLink } from "./invite.ts";
import { buildInviteCallback, parseInviteCallback } from "./invite-callback.ts";
import { isAdminFromEnv } from "./permissions.ts";

export type InviteDeps = {
  listContacts: () => Promise<InviteContact[]>;
  createInvite: (contactId: string) => Promise<CreateInviteResult>;
  unlink: (contactId: string) => Promise<UnlinkResult>;
  clientBotUsername: () => string | undefined;
};

const TEXT = {
  forbidden: "Команда доступна только администраторам.",
  forbiddenButton: "Это действие доступно только администраторам.",
  privateOnly: "Приглашения выдаются только в личке с ботом.",
  title: "Клиенты: нажмите на контакт, чтобы получить ссылку-приглашение, или отвяжите уже подключённого.",
  empty: "Нет активных контактов. Заведите их по docs/ops/clients.md.",
  unknown: "Неизвестное действие.",
  error: "Не удалось выполнить действие. Попробуйте ещё раз.",
  notConfigured: "Не задан TELEGRAM_CLIENT_BOT_USERNAME.",
  unavailable: "Контакт недоступен: возможно, он уже подключён или заблокирован. Откройте /invite заново.",
  linkReady: "Ссылка готова.",
  unlinked: "Контакт отвязан.",
  notLinked: "Контакт уже не привязан.",
  link: (contact: string, client: string, link: string) =>
    `Приглашение для: ${contact} (${client})\nДействует 7 дней, срабатывает один раз. Новая ссылка отменяет прежнюю.\n\n${link}`,
} as const;

function contactsKeyboard(contacts: InviteContact[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const contact of contacts) {
    const label = `${contact.name} · ${contact.clientName}`;
    if (contact.linked) keyboard.text(`🔓 Отвязать: ${label}`, buildInviteCallback("unlink", contact.id));
    else keyboard.text(`✉️ ${label}`, buildInviteCallback("new", contact.id));
    keyboard.row();
  }
  return keyboard;
}

/** Ответ на нажатие; устаревшее нажатие Telegram отклоняет, это не повод прерывать обработку. */
async function answer(ctx: Context, text: string, alert = false): Promise<void> {
  try {
    await ctx.answerCallbackQuery({ text, show_alert: alert });
  } catch (error) {
    console.warn("[telegram] answerCallbackQuery failed:", error instanceof Error ? error.message : error);
  }
}

/**
 * `/invite` служебного бота (ADR-0006 §5): только админы и только в личке, иначе ссылка
 * окажется в общей группе. Регистрировать до кнопок заявок: те отвечают на все остальные нажатия.
 */
export function registerInviteHandlers(bot: Bot, deps: InviteDeps): void {
  bot.chatType("private").command("invite", async (ctx) => {
    if (!isAdminFromEnv(ctx.from?.id)) {
      await ctx.reply(TEXT.forbidden);
      return;
    }
    let contacts: InviteContact[];
    try {
      contacts = await deps.listContacts();
    } catch (error) {
      console.error("[telegram] invite contacts failed:", error instanceof Error ? error.message : error);
      await ctx.reply(TEXT.error);
      return;
    }
    if (contacts.length === 0) {
      await ctx.reply(TEXT.empty);
      return;
    }
    await ctx.reply(TEXT.title, { reply_markup: contactsKeyboard(contacts) });
  });

  bot.callbackQuery(/^inv:/, async (ctx) => {
    if (!isAdminFromEnv(ctx.from.id)) return answer(ctx, TEXT.forbiddenButton, true);
    if (ctx.chat?.type !== "private") return answer(ctx, TEXT.privateOnly, true);

    const parsed = parseInviteCallback(ctx.callbackQuery.data);
    if (!parsed) return answer(ctx, TEXT.unknown, true);

    if (parsed.action === "new") {
      const username = deps.clientBotUsername();
      if (!username) return answer(ctx, TEXT.notConfigured, true);

      const invite = await deps.createInvite(parsed.contactId);
      if (!invite.ok) return answer(ctx, invite.code === "error" ? TEXT.error : TEXT.unavailable, true);

      await answer(ctx, TEXT.linkReady);
      // Без parse_mode: имена клиентов — данные, разметка им не нужна.
      await ctx.reply(TEXT.link(invite.contactName, invite.clientName, buildInviteLink(username, invite.token)), {
        link_preview_options: { is_disabled: true },
      });
      return;
    }

    const result = await deps.unlink(parsed.contactId);
    if (result === "error") return answer(ctx, TEXT.error, true);
    await answer(ctx, result === "unlinked" ? TEXT.unlinked : TEXT.notLinked);

    try {
      await ctx.editMessageReplyMarkup({ reply_markup: contactsKeyboard(await deps.listContacts()) });
    } catch (error) {
      // Контакт уже отвязан; сбой обновления кнопок (в т.ч. «message is not modified») не страшен.
      console.warn("[telegram] invite keyboard refresh failed:", error instanceof Error ? error.message : error);
    }
  });
}
