import { createBot } from "../src/lib/telegram/bot.ts";
import { parseBotKind } from "../src/lib/telegram/bot-kind.ts";
import { createClientBot } from "../src/lib/telegram/client/bot.ts";

/** Выбор бота по `--bot service|client`; токен читается только у выбранного. */
export function selectBot(args: readonly string[]) {
  const kind = parseBotKind(args);
  return { kind, bot: kind === "client" ? createClientBot() : createBot() };
}

/** Только текст: у ошибок Bot API в полях лежит запрос, а в нём секрет вебхука. */
export function errorText(error: unknown): unknown {
  return error instanceof Error ? error.message : error;
}
