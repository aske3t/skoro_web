import type { Metadata, Viewport } from "next";
import "../globals.css";

// Mini App — отдельный корневой layout (P-47): без шапки, футера и шрифтов сайта.
// Цвета берутся из темы Telegram: её переменные скрипт telegram-web-app.js ставит на <html>.
export const metadata: Metadata = {
  title: "Skoro",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function TelegramLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-[var(--tg-theme-bg-color,#ffffff)] font-sans text-[var(--tg-theme-text-color,#000000)] antialiased">
        {children}
      </body>
    </html>
  );
}
