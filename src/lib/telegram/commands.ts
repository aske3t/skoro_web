import type { Bot } from "grammy";

const HELP_TEXT = [
  "Служебный бот Skoro.",
  "",
  "Команды:",
  "/start — приветствие",
  "/orders — заказы (пока недоступно)",
  "/invite — приглашения клиентов (админы)",
  "/help — эта справка",
].join("\n");

export function registerCommands(bot: Bot): void {
  bot.command("start", (ctx) => ctx.reply("Cлужебный бот SKORO U VÁS. /help — список команд."));
  bot.command("help", (ctx) => ctx.reply(HELP_TEXT));
  bot.command("orders", (ctx) => ctx.reply("Список заказов появится позже."));
}
