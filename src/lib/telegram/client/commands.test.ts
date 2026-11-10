import { Bot } from "grammy";
import type { Update, UserFromGetMe } from "grammy/types";
import { describe, expect, it, vi } from "vitest";
import type { ClientContact } from "../contacts";
import { registerClientCommands, type ClientDeps } from "./commands";
import { MENU, TEXT } from "./texts";

const USER = 42;
const TOKEN = "a".repeat(32);
const CONTACT: ClientContact = {
  id: "contact-1",
  name: "Анна",
  phone: "+420777123456",
  email: "a@example.test",
  clientId: "client-1",
  clientName: "Клиент А",
  paymentMethod: "invoice",
};

type Sent = { method: string; payload: Record<string, unknown> };

function setup(overrides: Partial<ClientDeps> = {}) {
  const deps: ClientDeps = {
    findContact: vi.fn(async () => null),
    redeemInvite: vi.fn(async () => ({ ok: true as const, contactName: "Анна", clientName: "Клиент А" })),
    logout: vi.fn(async () => true),
    notifyLinked: vi.fn(async () => {}),
    listOrderOptions: vi.fn(async () => [{ id: "option-1", name: "Доставка по городу" }]),
    orderUrl: (id: string) => `https://example.test/tg/order/${id}`,
    listRecentOrders: vi.fn(async () => []),
    ...overrides,
  };
  const bot = new Bot("1:test", {
    botInfo: { id: 1, is_bot: true, first_name: "Skoro", username: "skoro_test_bot" } as UserFromGetMe,
  });
  const sent: Sent[] = [];
  bot.api.config.use(async (_prev, method, payload) => {
    sent.push({ method, payload: payload as Record<string, unknown> });
    return { ok: true, result: {} as never };
  });
  registerClientCommands(bot, deps);
  return { bot, deps, sent };
}

function message(text: string, chat: object = { id: USER, type: "private", first_name: "Test" }): Update {
  const command = /^\/\w+/.exec(text)?.[0];
  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: 0,
      chat,
      from: { id: USER, is_bot: false, first_name: "Анна", username: "anna" },
      text,
      ...(command ? { entities: [{ type: "bot_command", offset: 0, length: command.length }] } : {}),
    },
  } as Update;
}

const textsOf = (sent: Sent[]) => sent.filter((s) => s.method === "sendMessage").map((s) => s.payload.text);

function buttonsOf(sent: Sent[]): string[] {
  const markup = sent.at(-1)?.payload.reply_markup as { keyboard: { text: string }[][] };
  return markup.keyboard.flat().map((button) => button.text);
}

const asClient = { findContact: vi.fn(async () => CONTACT) };

describe("/start without an invite", () => {
  it("shows a guest only how to connect and how to contact us", async () => {
    const { bot, sent } = setup();
    await bot.handleUpdate(message("/start"));
    expect(textsOf(sent)).toEqual([TEXT.guestWelcome]);
    expect(buttonsOf(sent)).toEqual([MENU.howToConnect, MENU.contactGuest]);
  });

  it("greets a linked client with the full menu", async () => {
    const { bot, sent } = setup(asClient);
    await bot.handleUpdate(message("/start"));
    expect(textsOf(sent)).toEqual(["Здравствуйте, Клиент А"]);
    expect(buttonsOf(sent)).toEqual([MENU.newOrder, MENU.myOrders, MENU.profile, MENU.contactClient]);
  });

  it("treats a parameter that is not an invite as a plain start", async () => {
    const { bot, sent, deps } = setup();
    await bot.handleUpdate(message("/start hello"));
    expect(deps.redeemInvite).not.toHaveBeenCalled();
    expect(textsOf(sent)).toEqual([TEXT.guestWelcome]);
  });
});

describe("/start with an invite", () => {
  it("links the account, greets by client name and tells the group", async () => {
    const { bot, sent, deps } = setup();
    await bot.handleUpdate(message(`/start inv_${TOKEN}`));

    expect(deps.redeemInvite).toHaveBeenCalledWith(TOKEN, USER);
    expect(textsOf(sent)).toEqual(["Здравствуйте, Клиент А"]);
    expect(buttonsOf(sent)).toContain(MENU.newOrder);
    expect(deps.notifyLinked).toHaveBeenCalledWith({
      contactName: "Анна",
      clientName: "Клиент А",
      username: "anna",
      firstName: "Анна",
      telegramUserId: USER,
    });
  });

  it("refuses an invalid link and keeps the guest menu", async () => {
    const { bot, sent, deps } = setup({ redeemInvite: async () => ({ ok: false, code: "invalid" }) });
    await bot.handleUpdate(message(`/start inv_${TOKEN}`));
    expect(textsOf(sent)).toEqual([TEXT.inviteInvalid]);
    expect(buttonsOf(sent)).toEqual([MENU.howToConnect, MENU.contactGuest]);
    expect(deps.notifyLinked).not.toHaveBeenCalled();
  });

  it("refuses a malformed token without asking the database", async () => {
    const { bot, sent, deps } = setup();
    await bot.handleUpdate(message("/start inv_abc"));
    expect(deps.redeemInvite).not.toHaveBeenCalled();
    expect(textsOf(sent)).toEqual([TEXT.inviteInvalid]);
  });

  it("keeps the client menu when a linked client opens a used link", async () => {
    const { bot, sent } = setup({ ...asClient, redeemInvite: async () => ({ ok: false, code: "invalid" }) });
    await bot.handleUpdate(message(`/start inv_${TOKEN}`));
    expect(textsOf(sent)).toEqual([TEXT.inviteInvalid]);
    expect(buttonsOf(sent)).toContain(MENU.newOrder);
  });

  it("does not call a database failure a bad link", async () => {
    const { bot, sent } = setup({ redeemInvite: async () => ({ ok: false, code: "error" }) });
    await bot.handleUpdate(message(`/start inv_${TOKEN}`));
    expect(textsOf(sent)).toEqual([TEXT.unavailable]);
  });

  it("still lets the client in when the group notice fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { bot, sent } = setup({ notifyLinked: async () => Promise.reject(new Error("telegram down")) });
    await bot.handleUpdate(message(`/start inv_${TOKEN}`));
    expect(textsOf(sent)).toEqual(["Здравствуйте, Клиент А"]);
    error.mockRestore();
  });
});

describe("/logout", () => {
  it("unlinks and switches to the guest menu", async () => {
    const { bot, sent, deps } = setup(asClient);
    await bot.handleUpdate(message("/logout"));
    expect(deps.logout).toHaveBeenCalledWith(USER);
    expect(textsOf(sent)).toEqual([TEXT.logoutDone]);
    expect(buttonsOf(sent)).toEqual([MENU.howToConnect, MENU.contactGuest]);
  });

  it("says so when the account was not linked", async () => {
    const { bot, sent } = setup({ logout: async () => false });
    await bot.handleUpdate(message("/logout"));
    expect(textsOf(sent)).toEqual([TEXT.logoutGuest]);
  });
});

describe("menu", () => {
  it("answers the guest buttons", async () => {
    const { bot, sent } = setup();
    await bot.handleUpdate(message(MENU.howToConnect));
    await bot.handleUpdate(message(MENU.contactGuest));
    expect(textsOf(sent)).toEqual([TEXT.howToConnect, TEXT.contact]);
  });

  it("shows a client the profile", async () => {
    const { bot, sent } = setup(asClient);
    await bot.handleUpdate(message(MENU.profile));
    const [profile] = textsOf(sent);
    expect(profile).toContain("Клиент: Клиент А");
    expect(profile).toContain("Контакт: Анна");
    expect(profile).toContain("Оплата: по счёту");
    expect(profile).toContain("/logout");
  });

  it("lists the latest orders of the client", async () => {
    const { bot, sent, deps } = setup({
      ...asClient,
      listRecentOrders: vi.fn(async () => [
        { number: 12, optionName: "Доставка по городу", scheduledFor: "2026-07-15T10:05:00Z", status: "in_progress", price: 220 },
        { number: 11, optionName: null, scheduledFor: null, status: "new", price: null },
      ]),
    });
    await bot.handleUpdate(message(MENU.myOrders));

    expect(deps.listRecentOrders).toHaveBeenCalledWith("client-1");
    const [text] = textsOf(sent) as string[];
    expect(text).toContain("№12 · Доставка по городу");
    expect(text).toContain("Когда: 15.07.2026, 12:05");
    expect(text).toContain("Статус: Принят");
    expect(text).toContain("Цена: 220 Kč");
    expect(text).toContain("№11 · Заказ");
    expect(text).toContain("Когда: как можно скорее");
    expect(text).toContain("Статус: Ожидает подтверждения");
  });

  it("says so when there are no orders yet", async () => {
    const { bot, sent } = setup(asClient);
    await bot.handleUpdate(message(MENU.myOrders));
    expect(textsOf(sent)).toEqual([TEXT.noOrders]);
  });

  it.each([MENU.newOrder, MENU.myOrders, MENU.profile])("does not let a guest use %s", async (button) => {
    const { bot, sent } = setup();
    await bot.handleUpdate(message(button));
    expect(textsOf(sent)).toEqual([TEXT.notConnected]);
    expect(buttonsOf(sent)).toEqual([MENU.howToConnect, MENU.contactGuest]);
  });

  it("points to the menu on anything else", async () => {
    const { bot, sent } = setup();
    await bot.handleUpdate(message("привет"));
    await bot.handleUpdate(message("/unknown"));
    expect(textsOf(sent)).toEqual([TEXT.chooseFromMenu, TEXT.chooseFromMenu]);
  });
});

describe("new order", () => {
  type WebAppButton = { text: string; web_app?: { url: string } };
  const inlineButtonsOf = (sent: Sent[]) =>
    (sent.at(-1)?.payload.reply_markup as { inline_keyboard: WebAppButton[][] }).inline_keyboard.flat();

  it("offers each option of the client as a Mini App button", async () => {
    const { bot, sent, deps } = setup({
      ...asClient,
      listOrderOptions: vi.fn(async () => [
        { id: "option-1", name: "Доставка по городу" },
        { id: "option-2", name: "Документы" },
      ]),
    });
    await bot.handleUpdate(message(MENU.newOrder));

    expect(deps.listOrderOptions).toHaveBeenCalledWith("client-1");
    expect(textsOf(sent)).toEqual([TEXT.newOrder]);
    expect(inlineButtonsOf(sent)).toEqual([
      { text: "Доставка по городу", web_app: { url: "https://example.test/tg/order/option-1" } },
      { text: "Документы", web_app: { url: "https://example.test/tg/order/option-2" } },
    ]);
  });

  it("sends a button even for a single option", async () => {
    const { bot, sent } = setup(asClient);
    await bot.handleUpdate(message(MENU.newOrder));
    expect(inlineButtonsOf(sent)).toHaveLength(1);
  });

  it("says so when the client has no options", async () => {
    const { bot, sent } = setup({ ...asClient, listOrderOptions: vi.fn(async () => []) });
    await bot.handleUpdate(message(MENU.newOrder));
    expect(textsOf(sent)).toEqual([TEXT.noOptions]);
  });

  it("does not offer options to a guest", async () => {
    const { bot, sent, deps } = setup();
    await bot.handleUpdate(message(MENU.newOrder));
    expect(deps.listOrderOptions).not.toHaveBeenCalled();
    expect(textsOf(sent)).toEqual([TEXT.notConnected]);
  });

  it("answers instead of sending broken buttons when APP_URL is missing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { bot, sent } = setup({ ...asClient, orderUrl: () => null });
    await bot.handleUpdate(message(MENU.newOrder));
    expect(textsOf(sent)).toEqual([TEXT.unavailable]);
    error.mockRestore();
  });
});

describe("failures and groups", () => {
  it("answers instead of staying silent when the database fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { bot, sent } = setup({ findContact: async () => Promise.reject(new Error("db down")) });
    await bot.handleUpdate(message("/start"));
    await bot.handleUpdate(message(MENU.profile));
    expect(textsOf(sent)).toEqual([TEXT.unavailable, TEXT.unavailable]);
    error.mockRestore();
  });

  it.each(["/start", `/start inv_${TOKEN}`, "/logout", MENU.profile, "привет"])("stays silent in a group: %s", async (text) => {
    const { bot, sent, deps } = setup();
    await bot.handleUpdate(message(text, { id: -100, type: "supergroup", title: "Группа" }));
    expect(sent).toEqual([]);
    expect(deps.redeemInvite).not.toHaveBeenCalled();
    expect(deps.logout).not.toHaveBeenCalled();
  });
});
