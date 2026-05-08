"use client";

import { useEffect, useRef, useState } from "react";

type AddressSuggestion = {
  id: string;
  label: string;
  meta: string;
  lat: number;
  lon: number;
};

type AddressLookupInputProps = {
  id?: string;
  value: string;
  placeholder: string;
  className: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AddressSuggestion) => void;
};

export default function AddressLookupInput({
  id,
  value,
  placeholder,
  className,
  onChange,
  onSelect,
}: AddressLookupInputProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function searchAddress() {
    const query = value.trim();

    if (query.length < 3) {
      setSuggestions([]);
      setError("Введите минимум 3 символа");
      setOpen(true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setOpen(true);

    try {
      const response = await fetch(
        `/api/geocode/search?q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        throw new Error("Не удалось получить адреса");
      }

      const data = (await response.json()) as {
        suggestions?: AddressSuggestion[];
      };

      setSuggestions(data.suggestions ?? []);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setSuggestions([]);
      setError("Поиск временно недоступен");
    } finally {
      setLoading(false);
    }
  }

  function selectSuggestion(suggestion: AddressSuggestion) {
    onChange(suggestion.label);
    onSelect?.(suggestion);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setSuggestions([]);
            setError(null);
          }}
          onFocus={() => {
            if (suggestions.length > 0 || error) setOpen(true);
          }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              void searchAddress();
            }
            if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={className}
        />
        <button
          type="button"
          onClick={searchAddress}
          disabled={loading}
          className="shrink-0 rounded-xl border border-hairline-strong bg-bg/40 px-3 font-mono text-[10px] uppercase tracking-label text-ink-dim transition hover:border-brand/50 hover:text-ink disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "..." : "Найти"}
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-hairline-strong bg-bg-soft shadow-card">
          {loading ? (
            <div className="p-3 text-xs text-ink-muted">Ищем адрес...</div>
          ) : error ? (
            <div className="p-3 text-xs text-ink-muted">{error}</div>
          ) : suggestions.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className="block w-full border-b border-hairline px-3 py-2.5 text-left transition last:border-b-0 hover:bg-brand/10"
                >
                  <span className="block text-sm leading-snug text-ink">
                    {suggestion.label}
                  </span>
                  {suggestion.meta && (
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-label text-ink-dim">
                      {suggestion.meta}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-xs text-ink-muted">
              Адрес не найден. Уточните улицу, номер дома или город.
            </div>
          )}

          <div className="border-t border-hairline bg-bg/40 px-3 py-2 font-mono text-[9px] uppercase tracking-label text-ink-dim">
            Data ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-brand-glow/60 underline-offset-4 transition hover:text-ink"
            >
              OpenStreetMap contributors
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
