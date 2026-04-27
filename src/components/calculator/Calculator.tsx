"use client";

import { useEffect, useMemo, useState } from "react";
import { loadCalculatorData } from "@/lib/calculator/data";
import { compare } from "@/lib/calculator/pricing";
import type {
  CalculatorData,
  CalculatorResult,
  RetailPoint,
  Zone,
} from "@/lib/calculator/types";

const rubFormatter = new Intl.NumberFormat("ru-RU");
const formatRub = (n: number) => `${rubFormatter.format(Math.round(n))} ₽`;

export default function Calculator() {
  const [data, setData] = useState<CalculatorData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [pickupIds, setPickupIds] = useState<string[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [address, setAddress] = useState<string>("");

  // Загрузка справочников + выбор первой зоны как дефолта.
  useEffect(() => {
    loadCalculatorData()
      .then(d => {
        setData(d);
        setZoneId(d.zones[0]?.id ?? "");
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Не удалось загрузить данные");
      });
  }, []);

  const pointsByZone = useMemo(() => {
    if (!data) return new Map<string, RetailPoint[]>();
    const m = new Map<string, RetailPoint[]>();
    for (const z of data.zones) m.set(z.id, []);
    for (const p of data.retailPoints) {
      if (p.zone_id) m.get(p.zone_id)?.push(p);
    }
    return m;
  }, [data]);

  function togglePickup(id: string) {
    setPickupIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }

  // Пересчитываем сравнение только когда меняются вход или данные.
  const result = useMemo<CalculatorResult | null>(() => {
    if (!data || !zoneId || pickupIds.length === 0) return null;
    return compare(data, { pickupPointIds: pickupIds, deliveryZoneId: zoneId });
  }, [data, zoneId, pickupIds]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 font-mono text-sm text-red-200">
        Ошибка загрузки данных: {error}
      </div>
    );
  }

  if (!data) return <CalculatorSkeleton />;

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline-strong bg-bg-soft/60 p-6 shadow-card backdrop-blur-sm md:p-7">
      {/* Card header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-label text-ink-dim">
            Калькулятор
          </div>
          <h3 className="mt-2 font-display text-2xl leading-tight text-ink">
            Сколько стоит доставка
          </h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-label text-ink-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-glow" />
          live · из БД
        </div>
      </div>

      <div className="my-6 h-px w-full bg-hairline-strong" />

      {/* Адрес доставки */}
      <Field label="Адрес доставки" htmlFor="calc-address">
        <input
          id="calc-address"
          type="text"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="ул. Пятницкая, 25"
          className={inputClass}
        />
      </Field>

      {/* Зона доставки */}
      <div className="mt-5">
        <Field label="Зона доставки" htmlFor="calc-zone">
          <select
            id="calc-zone"
            value={zoneId}
            onChange={e => setZoneId(e.target.value)}
            className={`${inputClass} cursor-pointer pr-10`}
          >
            {data.zones.map(z => (
              <option key={z.id} value={z.id} className="bg-bg-deep text-ink">
                {z.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Точки забора, сгруппированные по зонам */}
      <div className="mt-5">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="font-mono text-[11px] uppercase tracking-label text-ink-muted">
            Точки забора
          </span>
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
            выбрано: {pickupIds.length}
          </span>
        </div>

        <div className="space-y-4">
          {data.zones.map(zone => {
            const points = pointsByZone.get(zone.id) ?? [];
            if (points.length === 0) return null;
            return (
              <ZoneGroup
                key={zone.id}
                zone={zone}
                points={points}
                selectedIds={pickupIds}
                onToggle={togglePickup}
              />
            );
          })}
        </div>
      </div>

      {/* Result panel */}
      <div className="my-6 h-px w-full bg-hairline-strong" />

      {result ? <ResultPanel result={result} /> : <ResultPlaceholder />}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-hairline-strong bg-bg/40 px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-dim transition focus:border-brand/60 focus:outline-none";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block font-mono text-[11px] uppercase tracking-label text-ink-muted"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ZoneGroup({
  zone,
  points,
  selectedIds,
  onToggle,
}: {
  zone: Zone;
  points: RetailPoint[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-label text-ink-dim">
        {zone.name}
      </div>
      <div className="flex flex-wrap gap-2">
        {points.map(p => {
          const selected = selectedIds.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              className={`rounded-full border px-3 py-1.5 text-left font-mono text-xs transition ${
                selected
                  ? "border-brand bg-brand/20 text-ink"
                  : "border-hairline-strong bg-bg/40 text-ink-muted hover:border-brand/40 hover:text-ink"
              }`}
            >
              {p.name}
              {p.delivery_service && (
                <span className="ml-2 text-[10px] text-ink-dim">
                  · {p.delivery_service}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultPlaceholder() {
  return (
    <div className="rounded-xl border border-dashed border-hairline-strong bg-bg/30 p-5 text-center">
      <div className="font-mono text-[11px] uppercase tracking-label text-ink-dim">
        Результат
      </div>
      <p className="mt-2 text-sm text-ink-muted">
        Выберите хотя бы одну точку забора — посчитаем выгоду.
      </p>
    </div>
  );
}

function ResultPanel({ result }: { result: CalculatorResult }) {
  const { competitors, skoro, savings, savingsPct } = result;

  // 3 состояния: выгодно / дороже / сопоставимо
  const tone =
    savings > 0 ? "win"
    : savings < 0 ? "lose"
    : "neutral";

  const toneClasses = {
    win: "border-brand/60 bg-brand/15 text-brand-glow",
    lose: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    neutral: "border-hairline-strong bg-bg/40 text-ink-muted",
  }[tone];

  const toneTitle = {
    win: `Экономия ${formatRub(savings)} · ${savingsPct}%`,
    lose: `Skoro дороже на ${formatRub(-savings)}`,
    neutral: "Цены сопоставимы",
  }[tone];

  return (
    <div>
      {/* Две колонки: их доставка vs Skoro */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-hairline-strong bg-hairline-strong">
        <CostColumn
          label="Их доставка"
          sub="суммарно по выбранным точкам"
          amount={competitors.total}
        />
        <CostColumn
          label="Skoro"
          sub="один маршрут"
          amount={skoro.total}
          accent
        />
      </div>

      {/* Бейдж экономии */}
      <div
        className={`mt-3 flex items-center justify-center rounded-xl border px-4 py-3 font-mono text-[11px] uppercase tracking-label ${toneClasses}`}
      >
        {toneTitle}
      </div>

      {/* Раскрывашка с детализацией */}
      <details className="mt-4 group">
        <summary className="cursor-pointer list-none font-mono text-[11px] uppercase tracking-label text-ink-dim transition hover:text-ink-muted">
          <span className="inline-block transition group-open:rotate-90">▸</span>{" "}
          Подробности
        </summary>

        <div className="mt-3 grid grid-cols-1 gap-3">
          <BreakdownList
            title="Их доставка"
            total={competitors.total}
            items={competitors.breakdown}
          />
          <BreakdownList
            title="Skoro · один маршрут"
            total={skoro.total}
            items={skoro.breakdown}
          />
        </div>
      </details>
    </div>
  );
}

function CostColumn({
  label,
  sub,
  amount,
  accent = false,
}: {
  label: string;
  sub: string;
  amount: number;
  accent?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 p-4 ${accent ? "bg-bg" : "bg-bg-soft/90"}`}>
      <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
        {label}
      </div>
      <div
        className={`font-display text-3xl leading-none md:text-4xl ${
          accent ? "text-brand-glow" : "text-ink"
        }`}
      >
        {formatRub(amount)}
      </div>
      <div className="font-mono text-[10px] text-ink-dim">{sub}</div>
    </div>
  );
}

function BreakdownList({
  title,
  total,
  items,
}: {
  title: string;
  total: number;
  items: { label: string; amount: number }[];
}) {
  return (
    <div className="rounded-lg border border-hairline bg-bg/40 p-3">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-label text-ink-dim">
        {title}
      </div>
      <ul className="space-y-1.5 text-xs text-ink-muted">
        {items.map((it, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span className="truncate">{it.label}</span>
            <span className="shrink-0 font-mono tabular-nums text-ink">
              {formatRub(it.amount)}
            </span>
          </li>
        ))}
        <li className="mt-2 flex items-baseline justify-between border-t border-hairline pt-2 font-mono text-[11px] uppercase tracking-label text-ink">
          <span>Итого</span>
          <span className="tabular-nums">{formatRub(total)}</span>
        </li>
      </ul>
    </div>
  );
}

function CalculatorSkeleton() {
  return (
    <div className="rounded-2xl border border-hairline-strong bg-bg-soft/60 p-6">
      <div className="h-6 w-1/2 animate-pulse rounded bg-bg-raised/60" />
      <div className="mt-5 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-bg-raised/40" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-bg-raised/40" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-bg-raised/40" />
      </div>
    </div>
  );
}
