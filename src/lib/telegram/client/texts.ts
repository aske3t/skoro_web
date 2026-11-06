import { Keyboard } from "grammy";
import type { ClientContact } from "../contacts.ts";

// Черновики текстов для утверждения владельцем.
const SUPPORT_PHONE = "+420 795 402 571";

const PAYMENT_LABEL: Record<string, string> = {
  invoice: "по счёту",
  cash: "наличными",
};

export const MENU = {
  howToConnect: "Как подключиться",
  contactGuest: "Связаться",
  newOrder: "🆕 Новый заказ",
  myOrders: "📋 Мои заказы",
  profile: "👤 Профиль",
  contactClient: "☎️ Связаться",
} as const;

export const TEXT = {
  guestWelcome: "Это бот Skoro для клиентов. Чтобы заказывать доставку, подключитесь по ссылке-приглашению от менеджера.",
  howToConnect: "Попросите у вашего менеджера Skoro ссылку-приглашение и откройте её в Telegram. Ссылка срабатывает один раз и действует 7 дней.",
  contact: `Связаться со Skoro: ${SUPPORT_PHONE}`,
  // Формулировка из ADR-0006 §5, одна на все причины: причину отказа посторонним не раскрываем.
  inviteInvalid: "Ссылка недействительна — попросите менеджера прислать новую",
  greeting: (clientName: string) => `Здравствуйте, ${clientName}`,
  comingSoon: "Появится на следующем шаге.",
  notConnected: "Сначала подключитесь по ссылке-приглашению от менеджера.",
  logoutDone: "Этот Telegram отключён. Чтобы подключиться снова, попросите у менеджера новую ссылку.",
  logoutGuest: "Этот Telegram не подключён.",
  unavailable: `Сервис временно недоступен. Попробуйте позже или позвоните: ${SUPPORT_PHONE}`,
  chooseFromMenu: "Выберите действие в меню.",
} as const;

export function formatProfile(contact: ClientContact): string {
  return [
    `Клиент: ${contact.clientName}`,
    `Контакт: ${contact.name}`,
    `Телефон: ${contact.phone ?? "—"}`,
    `Email: ${contact.email ?? "—"}`,
    `Оплата: ${PAYMENT_LABEL[contact.paymentMethod] ?? contact.paymentMethod}`,
    "",
    "Отключить этот Telegram: /logout",
  ].join("\n");
}

export function guestKeyboard(): Keyboard {
  return new Keyboard().text(MENU.howToConnect).text(MENU.contactGuest).resized().persistent();
}

export function clientKeyboard(): Keyboard {
  return new Keyboard()
    .text(MENU.newOrder)
    .text(MENU.myOrders)
    .row()
    .text(MENU.profile)
    .text(MENU.contactClient)
    .resized()
    .persistent();
}
