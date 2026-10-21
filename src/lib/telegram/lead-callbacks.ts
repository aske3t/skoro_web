import type { Bot, Context } from "grammy";
import { createAdminClient } from "../supabase/admin.ts";
import { formatLeadMessage } from "../leads/notify.ts";
import { parseCallbackData } from "./callback-data.ts";
import { applyLeadAction, getLead, type HandledLead } from "./lead-actions.ts";
import { sendClientEmailIfNeeded, type ClientEmailResult } from "./lead-email.ts";
import { buildRetryEmailKeyboard } from "./lead-keyboard.ts";
import { displayName, formatEmailNote, formatHandledNote } from "./lead-message.ts";
import { isAdminFromEnv } from "./permissions.ts";

const TEXT = {
  unknown: "Неизвестное действие.",
  forbidden: "Это действие доступно только администраторам.",
  notFound: "Заявка не найдена.",
  error: "Не удалось выполнить действие. Попробуйте ещё раз.",
  taken: "Заявка взята в работу.",
  spam: "Заявка помечена как спам.",
  emailSent: "Письмо клиенту отправлено.",
  emailFailed: "Не удалось отправить письмо клиенту. Попробуйте позже кнопкой под заявкой.",
  emailAlreadySent: "Письмо клиенту уже было отправлено.",
  emailNotApplicable: "Письмо клиенту для этой заявки не нужно.",
  alreadyHandled: (name: string | null) =>
    name ? `Заявку уже обработал(а): ${name}.` : "Заявка уже обработана.",
} as const;

const EMAIL_RESULT_TEXT: Record<ClientEmailResult, string> = {
  sent: TEXT.emailSent,
  failed: TEXT.emailFailed,
  already_sent: TEXT.emailAlreadySent,
  not_applicable: TEXT.emailNotApplicable,
};

/**
 * Ответ на нажатие. Ошибку не пробрасываем: Telegram отклоняет ответ на устаревшее нажатие
 * (бот был выключен), а дальнейшая обработка — письмо и правка сообщения — важнее «часиков».
 */
async function answer(ctx: Context, text: string, alert = false): Promise<void> {
  try {
    await ctx.answerCallbackQuery({ text, show_alert: alert });
  } catch (error) {
    console.warn("[telegram] answerCallbackQuery failed:", error instanceof Error ? error.message : error);
  }
}

/** Сообщение обработанной заявки: собирается из БД, поэтому одинаково при первом нажатии и повторе. */
async function renderHandled(ctx: Context, lead: HandledLead, email: ClientEmailResult): Promise<void> {
  const action = lead.status === "spam" ? "spam" : "take";
  const notes = [
    formatHandledNote(
      action,
      lead.handled_by_name ?? "—",
      lead.handled_at ? new Date(lead.handled_at) : new Date(),
    ),
  ];
  if (email !== "not_applicable") notes.push(formatEmailNote(email !== "failed"));

  try {
    await ctx.editMessageText(formatLeadMessage(lead, notes.join("\n")), {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: email === "failed" ? buildRetryEmailKeyboard(lead.id) : { inline_keyboard: [] },
    });
  } catch (error) {
    // Статус уже сохранён; сбой правки сообщения (в т.ч. «message is not modified») не ломает обработку.
    console.error("[telegram] edit message failed:", error instanceof Error ? error.message : error);
  }
}

/**
 * Кнопки под заявкой: «Взял в работу» / «Спам» (только из статуса `new`) и
 * «Отправить письмо повторно». Только админы.
 */
export function registerLeadCallbacks(bot: Bot): void {
  bot.on("callback_query:data", async (ctx) => {
    const parsed = parseCallbackData(ctx.callbackQuery.data);
    if (!parsed) return answer(ctx, TEXT.unknown, true);
    if (!isAdminFromEnv(ctx.from.id)) return answer(ctx, TEXT.forbidden, true);

    const db = createAdminClient();

    if (parsed.action === "email") {
      const found = await getLead(db, parsed.leadId);
      if (found.code === "not_found") return answer(ctx, TEXT.notFound, true);
      if (found.code === "error") return answer(ctx, TEXT.error, true);
      const email = await sendClientEmailIfNeeded(db, found.lead);
      await answer(ctx, EMAIL_RESULT_TEXT[email], email === "failed");
      await renderHandled(ctx, found.lead, email);
      return;
    }

    const result = await applyLeadAction({
      db,
      action: parsed.action,
      leadId: parsed.leadId,
      actor: { id: ctx.from.id, name: displayName(ctx.from) },
    });

    switch (result.code) {
      case "ok": {
        await answer(ctx, parsed.action === "take" ? TEXT.taken : TEXT.spam);
        const email = await sendClientEmailIfNeeded(db, result.lead);
        await renderHandled(ctx, result.lead, email);
        return;
      }
      case "already_handled": {
        // Заявку взяли, но письмо не ушло (сбой, бот был выключен) — досылаем при повторном нажатии.
        const email = await sendClientEmailIfNeeded(db, result.lead);
        if (email === "sent" || email === "failed") {
          await answer(ctx, EMAIL_RESULT_TEXT[email], email === "failed");
          await renderHandled(ctx, result.lead, email);
          return;
        }
        return answer(ctx, TEXT.alreadyHandled(result.lead.handled_by_name), true);
      }
      case "not_found":
        return answer(ctx, TEXT.notFound, true);
      case "error":
        return answer(ctx, TEXT.error, true);
    }
  });
}
