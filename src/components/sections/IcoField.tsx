"use client";

import { CircleCheck, CircleX, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ICO_LENGTH } from "@/lib/leads/constants";
import { isValidIco, normalizeIco } from "@/lib/leads/ico";
import { checkIco, type IcoCheckResult } from "@/lib/leads/ico-check";

const DEBOUNCE_MS = 400;

type Status = { state: "idle" } | { state: "checking" } | IcoCheckResult;

/**
 * IČO с проверкой в ARES сразу после ввода 8 цифр: показывает название фирмы
 * или причину отказа. При отправке сервер проверяет IČO ещё раз — это подсказка, а не защита.
 */
export function IcoField({
  defaultValue,
  className,
  invalidProps,
  hideStatus,
}: {
  defaultValue?: string;
  className: string;
  invalidProps: Record<string, unknown>;
  hideStatus?: boolean; // при ошибке поля текст ошибки показывает Field
}) {
  const [ico, setIco] = useState(() => normalizeIco(defaultValue ?? ""));
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    if (ico.length !== ICO_LENGTH) {
      setStatus({ state: "idle" });
      return;
    }
    if (!isValidIco(ico)) {
      setStatus({ status: "invalid" });
      return;
    }
    setStatus({ state: "checking" });
    const timer = setTimeout(async () => {
      try {
        const result = await checkIco(ico);
        if (requestId === requestRef.current) setStatus(result);
      } catch {
        if (requestId === requestRef.current) setStatus({ status: "unavailable" });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [ico]);

  return (
    <>
      <input
        id="ico"
        name="ico"
        type="text"
        inputMode="numeric"
        placeholder="12345678"
        autoComplete="off"
        maxLength={12}
        defaultValue={defaultValue}
        onChange={(e) => setIco(normalizeIco(e.target.value))}
        aria-describedby="ico-status"
        className={className}
        {...invalidProps}
      />
      {!hideStatus && <IcoStatus status={status} />}
    </>
  );
}

function IcoStatus({ status }: { status: Status }) {
  const line = (icon: React.ReactNode, text: React.ReactNode, tone: string) => (
    <p id="ico-status" role="status" className={`mt-2 flex items-start gap-1.5 text-sm ${tone}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </p>
  );

  if ("state" in status) {
    return status.state === "checking"
      ? line(<LoaderCircle size={14} className="animate-spin" />, "Проверяем в реестре ARES…", "text-ink-dim")
      : line(null, "Проверим фирму в реестре ARES.", "text-xs text-ink-dim");
  }
  switch (status.status) {
    case "found":
      return line(
        <CircleCheck size={14} />,
        <>
          <span className="text-ink">{status.name}</span> — найдена в ARES
        </>,
        "text-emerald-400",
      );
    case "inactive":
      return line(<CircleX size={14} />, `${status.name} — по данным ARES фирма закрыта.`, "text-red-400");
    case "not_found":
      return line(<CircleX size={14} />, "Фирма с таким IČO не найдена в ARES.", "text-red-400");
    case "invalid":
      return line(<CircleX size={14} />, "Проверьте IČO: контрольная цифра не сходится.", "text-red-400");
    case "unavailable":
      return line(
        <TriangleAlert size={14} />,
        "ARES сейчас не отвечает — проверим при отправке.",
        "text-amber-300",
      );
  }
}
