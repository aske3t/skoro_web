// Свои минимальные типы Telegram WebApp, без пакетов: только то, чем пользуется Mini App.
export type TelegramWebApp = {
  initData: string;
  colorScheme?: "light" | "dark";
  ready: () => void;
  expand: () => void;
  close: () => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

// Адрес из документации Telegram: https://core.telegram.org/bots/webapps
export const TELEGRAM_WEB_APP_SRC = "https://telegram.org/js/telegram-web-app.js?64";

/** WebApp, если страница открыта из Telegram: вне Telegram скрипт грузится, но `initData` пуст. */
export function currentWebApp(): TelegramWebApp | null {
  const webApp = window.Telegram?.WebApp;
  return webApp?.initData ? webApp : null;
}
