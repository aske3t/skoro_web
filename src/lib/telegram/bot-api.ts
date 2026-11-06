import { Api } from "grammy";
import { BOT_CONFIG, type BotKind } from "./bot-kind.ts";

/** Bot API от имени любого бота, без второго экземпляра `Bot`. Токен читается при вызове. */
export function botApi(kind: BotKind): Api {
  const { tokenEnv } = BOT_CONFIG[kind];
  const token = process.env[tokenEnv];
  if (!token) throw new Error(`${tokenEnv} is not set`);
  return new Api(token);
}
