"use client";

import { MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ADDRESS_MAX } from "@/lib/leads/constants";
import { loadGoogleMaps } from "@/lib/maps/loader";
import {
  fetchPlaceSuggestions,
  newSessionToken,
  type PlaceSuggestion,
} from "@/lib/maps/place-suggestions";

const MIN_QUERY = 3;
const DEBOUNCE_MS = 250;

/**
 * Адрес с подсказками Google (Чехия, приоритет — Брно). Поле неуправляемое и всегда редактируемое:
 * подсказки — только помощь, ручной ввод разрешён; без ключа Google или при сбое их просто нет.
 */
export function AddressInput({
  id,
  name,
  defaultValue,
  className,
  invalidProps,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  className: string;
  invalidProps: Record<string, unknown>;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | undefined>(undefined);
  const requestRef = useRef(0);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setItems([]);
      return;
    }
    const requestId = ++requestRef.current;
    const timer = setTimeout(async () => {
      try {
        if (!tokenRef.current) tokenRef.current = newSessionToken(await loadGoogleMaps());
        const next = await fetchPlaceSuggestions(q, tokenRef.current);
        // Ответ на устаревший запрос игнорируем.
        if (requestId !== requestRef.current) return;
        setItems(next);
        setActive(-1);
      } catch (error) {
        if (requestId === requestRef.current) setItems([]);
        console.warn(
          "[maps] address suggestions unavailable:",
          error instanceof Error ? error.message : error,
        );
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  function choose(item: PlaceSuggestion) {
    if (inputRef.current) inputRef.current.value = item.text;
    // Выбор завершает сессию автодополнения: следующий ввод — новая сессия.
    tokenRef.current = undefined;
    requestRef.current++;
    setItems([]);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const visible = open && items.length > 0;
    if (!visible) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      // Enter выбирает подсказку, а не отправляет форму.
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && items.length > 0;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        placeholder="Город, улица, номер дома"
        required
        autoComplete="off"
        maxLength={ADDRESS_MAX}
        defaultValue={defaultValue}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={className}
        {...invalidProps}
      />
      {showList && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-[4px] border border-[#1D1425]/15 bg-[#FBF8FE] shadow-[0_18px_40px_-16px_rgba(29,20,37,0.45)]">
          <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto py-1">
            {items.map((item, i) => (
              <li
                key={item.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, а не click: иначе blur поля закроет список раньше выбора.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(item);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 transition ${
                  i === active ? "bg-[#925AF4]/12" : ""
                }`}
              >
                <MapPin size={16} className="mt-0.5 shrink-0 text-[#925AF4]" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] text-[#1D1425]">{item.main}</span>
                  {item.secondary && (
                    <span className="block truncate text-[13px] text-[#1D1425]/70">{item.secondary}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-[#1D1425]/10 px-4 py-1.5 text-right text-[11px] text-[#1D1425]/60">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
