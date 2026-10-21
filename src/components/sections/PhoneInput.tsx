"use client";

import { ChevronDown, Globe } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { PHONE_COUNTRIES, PHONE_LOCAL_MAX } from "@/lib/leads/constants";
import {
  countryFlag,
  detectPhoneCountry,
  formatPhoneInput,
  withCountryCode,
  type PhoneCountry,
} from "@/lib/leads/phone-format";

/**
 * Телефон: клиент вписывает номер сам, с кодом страны («+380…») или без (считается чешским).
 * Код страны виден только в раскрытом списке; рядом с полем — флаг страны, определённой по коду.
 * Цифры разбиваются на группы прямо при вводе. Без JS это обычное поле.
 */
export function PhoneInput({
  id,
  name,
  autoComplete,
  required,
  defaultValue,
  invalidProps,
}: {
  id: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  invalidProps: Record<string, unknown>;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Копия значения неуправляемого поля — только чтобы показывать флаг.
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const country = detectPhoneCountry(value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function reformat(input: HTMLInputElement) {
    const next = formatPhoneInput(input.value);
    if (next !== input.value) {
      // Каретка остаётся после того же количества цифр, что и до форматирования.
      const caret = input.selectionStart ?? input.value.length;
      const digitsBefore = input.value.slice(0, caret).replace(/\D/g, "").length;
      input.value = next;
      let pos = next.startsWith("+") ? 1 : 0;
      for (let seen = 0; pos < next.length && seen < digitsBefore; pos++) {
        if (/\d/.test(next[pos])) seen++;
      }
      input.setSelectionRange(pos, pos);
    }
    setValue(input.value);
  }

  function pick(c: PhoneCountry) {
    const input = inputRef.current;
    setOpen(false);
    if (!input) return;
    input.value = withCountryCode(input.value, c);
    setValue(input.value);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          setOpen(false);
        }
      }}
    >
      <div className="flex items-stretch overflow-hidden rounded-xl border border-hairline-strong bg-bg/40 transition focus-within:border-brand/60 has-[[aria-invalid=true]]:border-red-400/70">
        <button
          type="button"
          aria-label={country ? `Код страны: ${country.name}` : "Выбрать код страны"}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 border-r border-hairline-strong px-3 text-ink-muted transition hover:bg-ink/5 hover:text-ink"
        >
          {country ? (
            <span className="text-base leading-none">{countryFlag(country.code)}</span>
          ) : (
            <Globe size={16} />
          )}
          <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
        </button>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          placeholder="+420 777 123 456"
          autoComplete={autoComplete}
          required={required}
          maxLength={PHONE_LOCAL_MAX}
          defaultValue={defaultValue}
          onChange={(e) => reformat(e.currentTarget)}
          className="min-w-0 flex-1 bg-transparent px-4 py-3.5 font-mono text-sm text-ink placeholder:text-ink-dim focus:outline-none"
          {...invalidProps}
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Код страны"
          className="absolute left-0 top-full z-30 mt-2 max-h-72 w-72 overflow-y-auto rounded-xl border border-hairline-strong bg-bg-soft py-1 shadow-card"
        >
          {PHONE_COUNTRIES.map((c) => (
            <li key={c.code} role="option" aria-selected={country?.code === c.code}>
              <button
                type="button"
                onClick={() => pick(c)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink transition hover:bg-brand/15 ${
                  country?.code === c.code ? "bg-brand/10" : ""
                }`}
              >
                <span className="text-base leading-none">{countryFlag(c.code)}</span>
                <span className="flex-1">{c.name}</span>
                <span className="font-mono text-xs text-ink-dim">{c.dial}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
