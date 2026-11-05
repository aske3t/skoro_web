import type { Bot } from "grammy";

const START_TEXT = "Бот Skoro для клиентов";

export function registerClientCommands(bot: Bot): void {
  // Клиентский бот работает только в личке (ADR-0006 §4).
  bot.chatType("private").command("start", (ctx) => ctx.reply(START_TEXT));
}
