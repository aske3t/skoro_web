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
  onCompanyChange,
}: {
  defaultValue?: string;
  className: string;
  invalidProps: Record<string, unknown>;
  hideStatus?: boolean; // при ошибке поля текст ошибки показывает Field
  onCompanyChange?: (name: string | null) => void; // название найденной в ARES фирмы — для шапки формы
}) {
  const [ico, setIco] = useState(() => normalizeIco(defaultValue ?? ""));
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const requestRef = useRef(0);

  useEffect(() => {
    onCompanyChange?.("status" in status && status.status === "found" ? status.name : null);
  }, [status, onCompanyChange]);

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
    <p id="ico-status" role="status" className={`mt-1.5 flex items-start gap-1.5 text-sm ${tone}`}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span>{text}</span>
    </p>
  );

  if ("state" in status) {
    return status.state === "checking"
      ? line(<LoaderCircle size={14} className="animate-spin" />, "Проверяем в реестре ARES…", "text-[#1D1425]/70")
      : line(null, "Проверим фирму в реестре ARES.", "text-[13px] text-[#1D1425]/70");
  }
  switch (status.status) {
    case "found":
      return line(
        <CircleCheck size={14} />,
        <>
          <span className="font-medium text-[#1D1425]">{status.name}</span> — найдена в ARES
        </>,
        "text-[#1E6B3A]",
      );
    case "inactive":
      return line(<CircleX size={14} />, `${status.name} — по данным ARES фирма закрыта.`, "text-[#B3261E]");
    case "not_found":
      return line(<CircleX size={14} />, "Фирма с таким IČO не найдена в ARES.", "text-[#B3261E]");
    case "invalid":
      return line(<CircleX size={14} />, "Проверьте IČO: контрольная цифра не сходится.", "text-[#B3261E]");
    case "unavailable":
      return line(
        <TriangleAlert size={14} />,
        "ARES сейчас не отвечает — проверим при отправке.",
        "text-[#8A5300]",
      );
  }
}
