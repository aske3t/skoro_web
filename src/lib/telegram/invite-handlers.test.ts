import { Bot } from "grammy";
import type { Update, UserFromGetMe } from "grammy/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseInviteCallback } from "./invite-callback";
import { registerInviteHandlers, type InviteDeps } from "./invite-handlers";

const ADMIN = 100;
const STRANGER = 200;
const CONTACT = "11111111-1111-4111-8111-111111111111";
const LINKED = "22222222-2222-4222-8222-222222222222";
const TOKEN = "a".repeat(32);

type Sent = { method: string; payload: Record<string, unknown> };

function setup(overrides: Partial<InviteDeps> = {}) {
  const deps: InviteDeps = {
    listContacts: vi.fn(async () => [
      { id: CONTACT, name: "Анна", clientName: "Клиент А", linked: false },
      { id: LINKED, name: "Борис", clientName: "Клиент Б", linked: true },
    ]),
    createInvite: vi.fn(async () => ({ ok: true as const, token: TOKEN, contactName: "Анна", clientName: "Клиент А" })),
    unlink: vi.fn(async () => "unlinked" as const),
    clientBotUsername: () => "skoro_client_bot",
    ...overrides,
  };
  const bot = new Bot("1:test", {
    botInfo: { id: 1, is_bot: true, first_name: "Skoro", username: "skoro_service_bot" } as UserFromGetMe,
  });
  const sent: Sent[] = [];
  bot.api.config.use(async (_prev, method, payload) => {
    sent.push({ method, payload: payload as Record<string, unknown> });
    return { ok: true, result: {} as never };
  });
  registerInviteHandlers(bot, deps);
  // Как обработчик кнопок заявок: стоит следом и отвечает на всё остальное.
  const leadHandler = vi.fn();
  bot.on("callback_query:data", leadHandler);
  return { bot, deps, sent, leadHandler };
}

const privateChat = (id: number) => ({ id, type: "private", first_name: "Test" });
const groupChat = { id: -100, type: "supergroup", title: "Заявки" };

function command(from: number, chat: object = privateChat(from)): Update {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: 0,
      chat,
      from: { id: from, is_bot: false, first_name: "Test" },
      text: "/invite",
      entities: [{ type: "bot_command", offset: 0, length: 7 }],
    },
  } as Update;
}

function press(from: number, data: string, chat: object = privateChat(from)): Update {
  return {
    update_id: 2,
    callback_query: {
      id: "1",
      from: { id: from, is_bot: false, first_name: "Test" },
      chat_instance: "1",
      data,
      message: { message_id: 5, date: 0, chat },
    },
  } as Update;
}

const answerOf = (sent: Sent[]) => sent.find((s) => s.method === "answerCallbackQuery")?.payload;
const replyOf = (sent: Sent[]) => sent.find((s) => s.method === "sendMessage")?.payload;

beforeEach(() => vi.stubEnv("TELEGRAM_ADMIN_IDS", String(ADMIN)));
afterEach(() => vi.unstubAllEnvs());

describe("/invite", () => {
  it("lists contacts with the right buttons for an admin", async () => {
    const { bot, sent } = setup();
    await bot.handleUpdate(command(ADMIN));

    const rows = (replyOf(sent)?.reply_markup as { inline_keyboard: { text: string; callback_data: string }[][] })
      .inline_keyboard;
    expect(rows[0][0].text).toBe("✉️ Анна · Клиент А");
    expect(parseInviteCallback(rows[0][0].callback_data)).toEqual({ action: "new", contactId: CONTACT });
    expect(rows[1][0].text).toBe("🔓 Отвязать: Борис · Клиент Б");
    expect(parseInviteCallback(rows[1][0].callback_data)).toEqual({ action: "unlink", contactId: LINKED });
  });

  it("refuses a stranger without touching contacts", async () => {
    const { bot, sent, deps } = setup();
    await bot.handleUpdate(command(STRANGER));
    expect(replyOf(sent)?.text).toBe("Команда доступна только администраторам.");
    expect(deps.listContacts).not.toHaveBeenCalled();
  });

  it("stays silent in a group, even for an admin", async () => {
    const { bot, sent, deps } = setup();
    await bot.handleUpdate(command(ADMIN, groupChat));
    expect(sent).toEqual([]);
    expect(deps.listContacts).not.toHaveBeenCalled();
  });

  it("answers instead of staying silent when the database fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { bot, sent } = setup({ listContacts: async () => Promise.reject(new Error("db down")) });
    await bot.handleUpdate(command(ADMIN));
    expect(replyOf(sent)?.text).toContain("Не удалось");
    error.mockRestore();
  });

  it("says when there are no contacts", async () => {
    const { bot, sent } = setup({ listContacts: async () => [] });
    await bot.handleUpdate(command(ADMIN));
    expect(replyOf(sent)?.text).toContain("Нет активных контактов");
  });
});

describe("invite button", () => {
  it("gives an admin a link to the client bot", async () => {
    const { bot, sent, deps } = setup();
    await bot.handleUpdate(press(ADMIN, `inv:new:${CONTACT}`));

    expect(deps.createInvite).toHaveBeenCalledWith(CONTACT);
    expect(replyOf(sent)?.text).toContain(`https://t.me/skoro_client_bot?start=inv_${TOKEN}`);
    expect(replyOf(sent)?.text).toContain("Анна (Клиент А)");
  });

  it("refuses a stranger", async () => {
    const { bot, sent, deps } = setup();
    await bot.handleUpdate(press(STRANGER, `inv:new:${CONTACT}`));
    expect(answerOf(sent)).toMatchObject({ show_alert: true });
    expect(deps.createInvite).not.toHaveBeenCalled();
    expect(replyOf(sent)).toBeUndefined();
  });

  it("never shows a link in a group", async () => {
    const { bot, sent, deps } = setup();
    await bot.handleUpdate(press(ADMIN, `inv:new:${CONTACT}`, groupChat));
    expect(deps.createInvite).not.toHaveBeenCalled();
    expect(replyOf(sent)).toBeUndefined();
  });

  it("does not create a token when the bot username is missing", async () => {
    const { bot, sent, deps } = setup({ clientBotUsername: () => undefined });
    await bot.handleUpdate(press(ADMIN, `inv:new:${CONTACT}`));
    expect(deps.createInvite).not.toHaveBeenCalled();
    expect(answerOf(sent)?.text).toContain("TELEGRAM_CLIENT_BOT_USERNAME");
  });

  it("reports an unavailable contact and a failure differently", async () => {
    const unavailable = setup({ createInvite: async () => ({ ok: false, code: "unavailable" }) });
    await unavailable.bot.handleUpdate(press(ADMIN, `inv:new:${CONTACT}`));
    expect(answerOf(unavailable.sent)?.text).toContain("Контакт недоступен");

    const failed = setup({ createInvite: async () => ({ ok: false, code: "error" }) });
    await failed.bot.handleUpdate(press(ADMIN, `inv:new:${CONTACT}`));
    expect(answerOf(failed.sent)?.text).toContain("Не удалось");
  });

  it("rejects damaged data", async () => {
    const { bot, sent, deps } = setup();
    await bot.handleUpdate(press(ADMIN, "inv:new:not-a-uuid"));
    expect(answerOf(sent)?.text).toBe("Неизвестное действие.");
    expect(deps.createInvite).not.toHaveBeenCalled();
  });
});

describe("unlink button", () => {
  it("unlinks and refreshes the buttons", async () => {
    const { bot, sent, deps } = setup();
    await bot.handleUpdate(press(ADMIN, `inv:unlink:${LINKED}`));
    expect(deps.unlink).toHaveBeenCalledWith(LINKED);
    expect(answerOf(sent)?.text).toBe("Контакт отвязан.");
    expect(sent.some((s) => s.method === "editMessageReplyMarkup")).toBe(true);
  });

  it("refuses a stranger", async () => {
    const { bot, deps } = setup();
    await bot.handleUpdate(press(STRANGER, `inv:unlink:${LINKED}`));
    expect(deps.unlink).not.toHaveBeenCalled();
  });

  it("reports a failure without refreshing", async () => {
    const { bot, sent } = setup({ unlink: async () => "error" });
    await bot.handleUpdate(press(ADMIN, `inv:unlink:${LINKED}`));
    expect(answerOf(sent)).toMatchObject({ show_alert: true });
    expect(sent.some((s) => s.method === "editMessageReplyMarkup")).toBe(false);
  });
});

describe("lead buttons", () => {
  it("still reach their own handler", async () => {
    const { bot, leadHandler, deps } = setup();
    await bot.handleUpdate(press(ADMIN, `lead:take:${CONTACT}`, groupChat));
    expect(leadHandler).toHaveBeenCalledTimes(1);
    expect(deps.createInvite).not.toHaveBeenCalled();
  });

  it("are not taken over by invite buttons", async () => {
    const { bot, leadHandler } = setup();
    await bot.handleUpdate(press(ADMIN, `inv:new:${CONTACT}`));
    expect(leadHandler).not.toHaveBeenCalled();
  });
});
