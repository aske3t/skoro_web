import { Bot } from "grammy";
import type { Update, UserFromGetMe } from "grammy/types";
import { describe, expect, it, vi } from "vitest";
import type { AdminClient } from "../supabase/admin.ts";
import { registerUserTracking, touchTelegramUser } from "./telegram-users";

const FROM = { id: 42, is_bot: false, first_name: "Анна", username: "anna" };

function setup(touch: Parameters<typeof registerUserTracking>[1]) {
  const bot = new Bot("1:test", {
    botInfo: { id: 1, is_bot: true, first_name: "Skoro", username: "skoro_test_bot" } as UserFromGetMe,
  });
  registerUserTracking(bot, touch);
  const after = vi.fn();
  bot.on("message", after);
  return { bot, after };
}

const message = (chat: object): Update =>
  ({ update_id: 1, message: { message_id: 1, date: 0, chat, from: FROM, text: "привет" } }) as Update;

describe("registerUserTracking", () => {
  it("records private updates and continues", async () => {
    const touch = vi.fn(async () => {});
    const { bot, after } = setup(touch);
    await bot.handleUpdate(message({ id: 42, type: "private", first_name: "Анна" }));
    expect(touch).toHaveBeenCalledWith(FROM);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("does not record group updates but lets them through", async () => {
    const touch = vi.fn(async () => {});
    const { bot, after } = setup(touch);
    await bot.handleUpdate(message({ id: -100, type: "supergroup", title: "Заявки" }));
    expect(touch).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("does not let a failed write stop the answer", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { bot, after } = setup(async () => Promise.reject(new Error("db down")));
    await bot.handleUpdate(message({ id: 42, type: "private", first_name: "Анна" }));
    expect(after).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe("touchTelegramUser", () => {
  const dbWith = (result: { error: unknown }) => {
    const upsert = vi.fn(async () => result);
    return { db: { from: () => ({ upsert }) } as unknown as AdminClient, upsert };
  };
  const now = new Date("2026-11-06T12:00:00Z");

  it("writes the user with missing fields as null", async () => {
    const { db, upsert } = dbWith({ error: null });
    await touchTelegramUser(db, { id: 42, first_name: "Анна" }, now);
    expect(upsert).toHaveBeenCalledWith({
      telegram_user_id: 42,
      first_name: "Анна",
      last_name: null,
      username: null,
      last_seen_at: "2026-11-06T12:00:00.000Z",
    });
  });

  it("throws on a database error", async () => {
    await expect(touchTelegramUser(dbWith({ error: new Error("db") }).db, { id: 42, first_name: "Анна" }, now)).rejects.toThrow("db");
  });
});
