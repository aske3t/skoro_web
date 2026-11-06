import type { Bot } from "grammy";
import type { AdminClient } from "../supabase/admin.ts";

export type TelegramUserInfo = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

export async function touchTelegramUser(db: AdminClient, user: TelegramUserInfo, now = new Date()): Promise<void> {
  const { error } = await db.from("telegram_users").upsert({
    telegram_user_id: user.id,
    first_name: user.first_name,
    last_name: user.last_name ?? null,
    username: user.username ?? null,
    last_seen_at: now.toISOString(),
  });
  if (error) throw error;
}

/** Каждое личное обновление обновляет `telegram_users`. Сбой записи не мешает ответу. */
export function registerUserTracking(bot: Bot, touch: (user: TelegramUserInfo) => Promise<void>): void {
  bot.chatType("private").use(async (ctx, next) => {
    if (ctx.from) {
      try {
        await touch(ctx.from);
      } catch (error) {
        console.warn("[telegram] telegram_users update failed:", error instanceof Error ? error.message : error);
      }
    }
    await next();
  });
}
