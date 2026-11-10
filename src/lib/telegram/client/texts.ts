import { Keyboard } from "grammy";
import { formatPragueDateTime } from "../../orders/prague-time.ts";
import type { RecentOrder } from "../../orders/queries.ts";
import type { ClientContact } from "../contacts.ts";

// Черновики текстов для утверждения владельцем.
const SUPPORT_PHONE = "+420 795 402 571";

const PAYMENT_LABEL: Record<string, string> = {
  invoice: "по счёту",
  cash: "наличными",
};

// Метки статусов — ADR-0005 §4. Значения order_status не меняются.
const STATUS_LABEL: Record<string, string> = {
  new: "Ожидает подтверждения",
  in_progress: "Принят",
  delivered: "Доставлен",
  cancelled: "Отменён",
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
  noOrders: "Заказов пока нет. Нажмите «🆕 Новый заказ».",
  orderReceived: (number: number | null) =>
    `Заказ${number !== null ? ` №${number}` : ""} получен, ждёт подтверждения`,
  newOrder: "Выберите услугу — форма заказа откроется прямо в Telegram.",
  noOptions: `Для вас пока не подключено ни одной услуги. Свяжитесь с менеджером: ${SUPPORT_PHONE}`,
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

export function formatRecentOrders(orders: RecentOrder[]): string {
  if (orders.length === 0) return TEXT.noOrders;
  const blocks = orders.map((order) =>
    [
      `№${order.number ?? "—"} · ${order.optionName ?? "Заказ"}`,
      `Когда: ${order.scheduledFor ? formatPragueDateTime(new Date(order.scheduledFor)) : "как можно скорее"}`,
      `Статус: ${STATUS_LABEL[order.status] ?? order.status}`,
      `Цена: ${order.price !== null ? `${order.price} Kč` : "—"}`,
    ].join("\n"),
  );
  return [`Последние заказы (${orders.length}):`, ...blocks].join("\n\n");
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
