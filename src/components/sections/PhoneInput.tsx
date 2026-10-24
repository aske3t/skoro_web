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
  // Номер без кода страны считается чешским — флаг CZ показываем сразу, глобус только для неизвестного кода.
  const country =
    detectPhoneCountry(value) ?? (/^\s*(\+|00)/.test(value) ? null : PHONE_COUNTRIES[0]);

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
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={country ? `Код страны: ${country.name}` : "Выбрать код страны"}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((o) => !o)}
          className="-ml-1 flex items-center gap-1 rounded-[4px] px-1 py-1 text-[#1D1425]/70 transition hover:bg-[#1D1425]/5 hover:text-[#1D1425] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#925AF4]"
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
          className="min-w-0 flex-1 border-l border-[#1D1425]/15 bg-transparent py-1 pl-3 text-base tabular-nums text-[#1D1425] placeholder:text-[#1D1425]/60 focus:outline-none"
          {...invalidProps}
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Код страны"
          className="absolute left-0 top-full z-30 mt-2 max-h-72 w-72 overflow-y-auto rounded-[4px] border border-[#1D1425]/15 bg-[#FBF8FE] py-1 shadow-[0_18px_40px_-16px_rgba(29,20,37,0.45)]"
        >
          {PHONE_COUNTRIES.map((c) => (
            <li key={c.code} role="option" aria-selected={country?.code === c.code}>
              <button
                type="button"
                onClick={() => pick(c)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] text-[#1D1425] transition hover:bg-[#925AF4]/10 ${
                  country?.code === c.code ? "bg-[#925AF4]/15" : ""
                }`}
              >
                <span className="text-base leading-none">{countryFlag(c.code)}</span>
                <span className="flex-1">{c.name}</span>
                <span className="text-sm tabular-nums text-[#1D1425]/70">{c.dial}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
