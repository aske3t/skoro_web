"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import { loadOrderForm, type MiniAppErrorCode, type OrderFormData } from "@/app/tg/actions";
import { CityDeliveryOrder } from "./CityDeliveryOrder";
import { currentWebApp, TELEGRAM_WEB_APP_SRC } from "./telegram-web-app";

type View =
  | { kind: "loading" }
  | { kind: "outside" }
  | { kind: "script_failed" }
  | { kind: "error"; code: MiniAppErrorCode }
  | { kind: "form"; form: OrderFormData; initData: string }
  | { kind: "done"; number: number | null; total: number };

const ERROR_TEXT: Record<MiniAppErrorCode, string> = {
  unauthorized: "Не удалось подтвердить вход. Закройте форму и откройте её заново из бота.",
  not_linked: "Этот Telegram не подключён. Попросите у менеджера ссылку-приглашение.",
  client_inactive: "Заказы для вашей компании сейчас недоступны. Свяжитесь с менеджером.",
  option_unavailable: "Эта услуга сейчас недоступна. Нажмите «Новый заказ» в боте заново.",
  server_error: "Не удалось загрузить форму. Попробуйте позже.",
};

// После успеха форма закрывается сама: подтверждение придёт в чат.
const CLOSE_AFTER_MS = 3000;

const hint = "text-[var(--tg-theme-hint-color,#707579)]";

/** Mini App формы заказа (ADR-0006 §6). Кто открыл, проверяет сервер по `initData`. */
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
    // Тёмная тема Telegram — тёмные скроллбары и системные элементы вне карточки формы.
    if (webApp.colorScheme) document.documentElement.style.colorScheme = webApp.colorScheme;
    webApp.ready();
    webApp.expand();

    const { initData } = webApp;
    loadOrderForm(initData, clientOptionId)
      .then((state) =>
        setView(state.status === "ok" ? { kind: "form", form: state.form, initData } : { kind: "error", code: state.code }),
      )
      .catch(() => setView({ kind: "error", code: "server_error" }));
  }

  function finish(result: { number: number | null; total: number }) {
    setView({ kind: "done", ...result });
    window.scrollTo({ top: 0 });
    setTimeout(() => currentWebApp()?.close(), CLOSE_AFTER_MS);
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-5">
      <Script
        src={TELEGRAM_WEB_APP_SRC}
        strategy="afterInteractive"
        onReady={start}
        onError={() => setView({ kind: "script_failed" })}
      />
      <Content view={view} clientOptionId={clientOptionId} onDone={finish} />
    </main>
  );
}

function Content({
  view,
  clientOptionId,
  onDone,
}: {
  view: View;
  clientOptionId: string;
  onDone: (result: { number: number | null; total: number }) => void;
}) {
  switch (view.kind) {
    case "loading":
      return <p className={hint}>Загружаем…</p>;
    case "outside":
      return <p>Откройте форму через бота Skoro в Telegram.</p>;
    case "script_failed":
      return <p>Не удалось связаться с Telegram. Проверьте интернет и откройте форму заново.</p>;
    case "error":
      return <p role="alert">{ERROR_TEXT[view.code]}</p>;
    case "done":
      return (
        <div className="py-10 text-center">
          <h1 className="text-xl font-semibold">Заказ{view.number !== null ? ` №${view.number}` : ""} отправлен</h1>
          <p className={`mt-2 ${hint}`}>
            Цена {view.total} Kč. Заказ ждёт подтверждения — статус придёт в чат с ботом.
          </p>
          <button
            type="button"
            onClick={() => currentWebApp()?.close()}
            className="mt-6 rounded-full bg-[var(--tg-theme-button-color,#2481cc)] px-6 py-3 text-[15px] font-medium text-[var(--tg-theme-button-text-color,#ffffff)]"
          >
            Закрыть
          </button>
        </div>
      );
    case "form":
      if (view.form.formKind !== "city_delivery") return <p role="alert">{ERROR_TEXT.option_unavailable}</p>;
      return (
        <>
          <header className="mb-4">
            <p className={`text-sm ${hint}`}>{view.form.clientName}</p>
            <h1 className="text-xl font-semibold">{view.form.optionName}</h1>
          </header>
          <CityDeliveryOrder
            form={view.form}
            initData={view.initData}
            clientOptionId={clientOptionId}
            onDone={onDone}
          />
        </>
      );
  }
}
