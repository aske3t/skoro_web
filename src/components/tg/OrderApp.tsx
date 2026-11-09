"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import { loadOrderForm, type MiniAppErrorCode, type OrderFormState } from "@/app/tg/actions";
import { currentWebApp, TELEGRAM_WEB_APP_SRC } from "./telegram-web-app";

type View =
  | { kind: "loading" }
  | { kind: "outside" }
  | { kind: "script_failed" }
  | { kind: "loaded"; state: OrderFormState };

const ERROR_TEXT: Record<MiniAppErrorCode, string> = {
  unauthorized: "Не удалось подтвердить вход. Закройте форму и откройте её заново из бота.",
  not_linked: "Этот Telegram не подключён. Попросите у менеджера ссылку-приглашение.",
  client_inactive: "Заказы для вашей компании сейчас недоступны. Свяжитесь с менеджером.",
  option_unavailable: "Эта услуга сейчас недоступна. Нажмите «Новый заказ» в боте заново.",
  server_error: "Не удалось загрузить форму. Попробуйте позже.",
};

const hint = "text-[var(--tg-theme-hint-color,#707579)]";

/**
 * Mini App формы заказа. Шаг 4, часть 1: проверяет вход на сервере и здоровается —
 * так видно, что связка Telegram → Vercel → Server Action работает. Форма — в части 2.
 */
export function OrderApp({ clientOptionId }: { clientOptionId: string }) {
  const [view, setView] = useState<View>({ kind: "loading" });
  const startedRef = useRef(false);

  function start() {
    if (startedRef.current) return;
    startedRef.current = true;

    const webApp = currentWebApp();
    if (!webApp) {
      setView({ kind: "outside" });
      return;
    }
    // Тёмная тема Telegram — тёмные поля ввода и скроллбары.
    if (webApp.colorScheme) document.documentElement.style.colorScheme = webApp.colorScheme;
    webApp.ready();
    webApp.expand();

    loadOrderForm(webApp.initData, clientOptionId)
      .then((state) => setView({ kind: "loaded", state }))
      .catch(() => setView({ kind: "loaded", state: { status: "error", code: "server_error" } }));
  }

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Script
        src={TELEGRAM_WEB_APP_SRC}
        strategy="afterInteractive"
        onReady={start}
        onError={() => setView({ kind: "script_failed" })}
      />
      <Content view={view} />
    </main>
  );
}

function Content({ view }: { view: View }) {
  switch (view.kind) {
    case "loading":
      return <p className={hint}>Загружаем…</p>;
    case "outside":
      return <p>Откройте форму через бота Skoro в Telegram.</p>;
    case "script_failed":
      return <p>Не удалось связаться с Telegram. Проверьте интернет и откройте форму заново.</p>;
    case "loaded": {
      const { state } = view;
      if (state.status === "error") return <p role="alert">{ERROR_TEXT[state.code]}</p>;
      return (
        <>
          <h1 className="text-xl font-semibold">Здравствуйте, {state.clientName}</h1>
          <p className="mt-2">Услуга: {state.optionName}</p>
          <p className={`mt-4 text-sm ${hint}`}>Форма заказа появится на следующем этапе.</p>
        </>
      );
    }
  }
}
