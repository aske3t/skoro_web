import type { Bot } from "grammy";
import { createAdminClient } from "../supabase/admin.ts";
import { formatLeadMessage } from "../leads/notify.ts";
import { parseCallbackData } from "./callback-data.ts";
import { applyLeadAction } from "./lead-actions.ts";
import { displayName, formatHandledNote } from "./lead-message.ts";
import { isAdminFromEnv } from "./permissions.ts";

const TEXT = {
  unknown: "Неизвестное действие.",
  forbidden: "Это действие доступно только администраторам.",
  notFound: "Заявка не найдена.",
  error: "Не удалось выполнить действие. Попробуйте ещё раз.",
  taken: "Заявка взята в работу.",
  spam: "Заявка помечена как спам.",
  alreadyHandled: (name: string | null) =>
    name ? `Заявку уже обработал(а): ${name}.` : "Заявка уже обработана.",
} as const;

/** Кнопки «Взял в работу» / «Спам» под заявкой. Только админы, только из статуса `new`. */
export function registerLeadCallbacks(bot: Bot): void {
  bot.on("callback_query:data", async (ctx) => {
    const parsed = parseCallbackData(ctx.callbackQuery.data);
    if (!parsed) {
      await ctx.answerCallbackQuery({ text: TEXT.unknown, show_alert: true });
      return;
    }

    if (!isAdminFromEnv(ctx.from.id)) {
      await ctx.answerCallbackQuery({ text: TEXT.forbidden, show_alert: true });
      return;
    }

    let result;
    try {
      result = await applyLeadAction({
        db: createAdminClient(),
        action: parsed.action,
        leadId: parsed.leadId,
        actor: { id: ctx.from.id, name: displayName(ctx.from) },
      });
    } catch (error) {
      console.error("[telegram] lead action failed:", error instanceof Error ? error.message : error);
      result = { code: "error" } as const;
    }

    switch (result.code) {
      case "ok": {
        await ctx.answerCallbackQuery({ text: parsed.action === "take" ? TEXT.taken : TEXT.spam });
        const note = formatHandledNote(parsed.action, displayName(ctx.from), result.handledAt);
        try {
          await ctx.editMessageText(formatLeadMessage(result.lead, note), {
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true },
            reply_markup: { inline_keyboard: [] },
          });
        } catch (error) {
          // Статус уже сохранён; сбой правки сообщения не должен ломать обработку.
          console.error("[telegram] edit message failed:", error instanceof Error ? error.message : error);
        }
        return;
      }
      case "already_handled":
        await ctx.answerCallbackQuery({
          text: TEXT.alreadyHandled(result.lead.handled_by_name),
          show_alert: true,
        });
        return;
      case "not_found":
        await ctx.answerCallbackQuery({ text: TEXT.notFound, show_alert: true });
        return;
      case "error":
        await ctx.answerCallbackQuery({ text: TEXT.error, show_alert: true });
        return;
    }
  });
}
