import { Bot } from "grammy";
import type { Update, UserFromGetMe } from "grammy/types";
import { describe, expect, it } from "vitest";
import { registerClientCommands } from "./commands";

function setup() {
  const bot = new Bot("1:test", {
    botInfo: { id: 1, is_bot: true, first_name: "Skoro", username: "skoro_test_bot" } as UserFromGetMe,
  });
  const methods: string[] = [];
  bot.api.config.use(async (_prev, method) => {
    methods.push(method);
    return { ok: true, result: {} as never };
  });
  registerClientCommands(bot);
  return { bot, methods };
}

function startFrom(chat: { id: number; type: "private" | "supergroup" }): Update {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: 0,
      chat: chat.type === "private" ? { ...chat, type: "private", first_name: "Test" } : { ...chat, type: "supergroup", title: "Test" },
      from: { id: 2, is_bot: false, first_name: "Test" },
      text: "/start",
      entities: [{ type: "bot_command", offset: 0, length: 6 }],
    },
  } as Update;
}

describe("client bot /start", () => {
  it("answers in a private chat", async () => {
    const { bot, methods } = setup();
    await bot.handleUpdate(startFrom({ id: 2, type: "private" }));
    expect(methods).toEqual(["sendMessage"]);
  });

  it("stays silent in a group", async () => {
    const { bot, methods } = setup();
    await bot.handleUpdate(startFrom({ id: -100, type: "supergroup" }));
    expect(methods).toEqual([]);
  });
});
