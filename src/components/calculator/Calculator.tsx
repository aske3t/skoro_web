"use client";

import { useEffect, useMemo, useState } from "react";
import AddressLookupInput from "./AddressLookupInput";
import { loadCalculatorData } from "@/lib/calculator/data";
import { compare } from "@/lib/calculator/pricing";
import type {
  CalculatorData,
  CalculatorResult,
  RetailPoint,
  Zone,
} from "@/lib/calculator/types";

// Чешские кроны: режим `currency` сам подставит "Kč" и расставит разделители.
const czkFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
});
const formatCzk = (n: number) => czkFormatter.format(n);

type CalculatorMode = "compare" | "route";
type RouteDetailId = "size" | "buyout" | "stops";
type RouteStop = {
  address: string;
  details: Record<RouteDetailId, boolean>;
};

const MAX_ROUTE_STOPS = 3;
const supportPhone = "+420 795 402 571";
const supportPhoneHref = "tel:+420795402571";

const routeDetails: { id: RouteDetailId; label: string }[] = [
  { id: "size", label: "Вес свыше 15кг" },
  { id: "buyout", label: "Позиции по выкупу" },
  { id: "stops", label: "Необходима доверенность" },
];

function createRouteStop(): RouteStop {
  return {
    address: "",
    details: {
      size: false,
      buyout: false,
      stops: true,
    },
  };
}

export default function Calculator() {
  const [data, setData] = useState<CalculatorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<CalculatorMode>("compare");

  // Form state
  const [pickupIds, setPickupIds] = useState<string[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [routeAddress, setRouteAddress] = useState<string>("");
  const [routeStops, setRouteStops] = useState<RouteStop[]>([
    createRouteStop(),
  ]);
  const [showIndividualDeal, setShowIndividualDeal] = useState(false);

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

  function updateRouteStop(index: number, value: string) {
    setRouteStops(prev =>
      prev.map((stop, i) =>
        i === index ? { ...stop, address: value } : stop,
      ),
    );
  }

  function addRouteStop() {
    if (routeStops.length >= MAX_ROUTE_STOPS) {
      setShowIndividualDeal(true);
      return;
    }

    setRouteStops(prev => [...prev, createRouteStop()]);

    if (routeStops.length + 1 >= MAX_ROUTE_STOPS) {
      setShowIndividualDeal(true);
    }
  }

  function removeRouteStop(index: number) {
    setRouteStops(prev =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  function toggleRouteDetail(stopIndex: number, id: RouteDetailId) {
    setRouteStops(prev =>
      prev.map((stop, index) =>
        index === stopIndex
          ? {
              ...stop,
              details: {
                ...stop.details,
                [id]: !stop.details?.[id],
              },
            }
          : stop,
      ),
    );
  }

  // Пересчитываем сравнение только когда меняются вход или данные.
  const result = useMemo<CalculatorResult | null>(() => {
    if (!data || !zoneId || pickupIds.length === 0) return null;
    return compare(data, { pickupPointIds: pickupIds, deliveryZoneId: zoneId });
  }, [data, zoneId, pickupIds]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 font-mono text-sm text-red-200">
        Ошибка загрузки данных: {error}
      </div>
    );
  }

  if (!data) return <CalculatorSkeleton />;

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline-strong bg-bg-soft/60 p-5 shadow-card backdrop-blur-sm">
      {/* Card header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
            Калькулятор для мультизадач
          </div>
          <h3 className="mt-1.5 font-display text-xl leading-tight text-ink">
            {mode === "compare" ? "Сколько стоит доставка" : "Соберите свою доставку"}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label text-ink-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-glow" />
          live
        </div>
      </div>

      <ModeSwitch mode={mode} onChange={setMode} />

      <div className="my-4 h-px w-full bg-hairline-strong" />

      {mode === "compare" ? (
        <CompareMode
          address={address}
          data={data}
          pointsByZone={pointsByZone}
          pickupIds={pickupIds}
          result={result}
          zoneId={zoneId}
          onAddressChange={setAddress}
          onPickupToggle={togglePickup}
          onZoneChange={setZoneId}
        />
      ) : (
        <RouteBuilderMode
          address={routeAddress}
          stops={routeStops}
          onAddStop={addRouteStop}
          onAddressChange={setRouteAddress}
          onRemoveStop={removeRouteStop}
          onStopChange={updateRouteStop}
          onToggleDetail={toggleRouteDetail}
        />
      )}

      {showIndividualDeal && (
        <IndividualDealDialog onClose={() => setShowIndividualDeal(false)} />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-hairline-strong bg-bg/40 px-3.5 py-2.5 font-mono text-sm text-ink placeholder:text-ink-dim transition focus:border-brand/60 focus:outline-none";

function ModeSwitch({
  mode,
  onChange,
}: {
  mode: CalculatorMode;
  onChange: (mode: CalculatorMode) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-1 rounded-[1.25rem] border border-hairline-strong bg-bg/40 p-1 sm:grid-cols-2 sm:rounded-full">
      <button
        type="button"
        onClick={() => onChange("compare")}
        className={`rounded-full px-4 py-3 font-mono text-[10px] uppercase tracking-label transition ${
          mode === "compare"
            ? "bg-ink text-bg"
            : "text-ink-dim hover:bg-ink/5 hover:text-ink"
        }`}
      >
        Сравнить стоимость
      </button>
      <button
        type="button"
        onClick={() => onChange("route")}
        className={`rounded-full px-4 py-3 font-mono text-[10px] uppercase tracking-label transition ${
          mode === "route"
            ? "bg-ink text-bg"
            : "text-ink-dim hover:bg-ink/5 hover:text-ink"
        }`}
      >
        Собрать маршрут
      </button>
    </div>
  );
}

function CompareMode({
  address,
  data,
  pointsByZone,
  pickupIds,
  result,
  zoneId,
  onAddressChange,
  onPickupToggle,
  onZoneChange,
}: {
  address: string;
  data: CalculatorData;
  pointsByZone: Map<string, RetailPoint[]>;
  pickupIds: string[];
  result: CalculatorResult | null;
  zoneId: string;
  onAddressChange: (value: string) => void;
  onPickupToggle: (id: string) => void;
  onZoneChange: (value: string) => void;
}) {
  return (
    <>
      {/* Адрес доставки */}
      <Field label="Адрес доставки" htmlFor="calc-address">
        <AddressLookupInput
          id="calc-address"
          value={address}
          onChange={onAddressChange}
          placeholder="Masarykova 34/413, 602 00 Brno"
          className={inputClass}
        />
      </Field>

      {/* Зона доставки */}
      <div className="mt-3">
        <Field label="Зона доставки" htmlFor="calc-zone">
          <select
            id="calc-zone"
            value={zoneId}
            onChange={e => onZoneChange(e.target.value)}
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
      <div className="mt-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-muted">
            Точки забора
          </span>
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
            выбрано: {pickupIds.length}
          </span>
        </div>

        <div className="space-y-2.5">
          {data.zones.map(zone => {
            const points = pointsByZone.get(zone.id) ?? [];
            if (points.length === 0) return null;
            return (
              <ZoneGroup
                key={zone.id}
                zone={zone}
                points={points}
                selectedIds={pickupIds}
                onToggle={onPickupToggle}
              />
            );
          })}
        </div>
      </div>

      {/* Result panel */}
      <div className="my-4 h-px w-full bg-hairline-strong" />

      {result ? (
        <>
          <ResultPanel result={result} />
          <PricingNotice />
        </>
      ) : (
        <ResultPlaceholder />
      )}
    </>
  );
}

function RouteBuilderMode({
  address,
  stops,
  onAddStop,
  onAddressChange,
  onRemoveStop,
  onStopChange,
  onToggleDetail,
}: {
  address: string;
  stops: RouteStop[];
  onAddStop: () => void;
  onAddressChange: (value: string) => void;
  onRemoveStop: (index: number) => void;
  onStopChange: (index: number, value: string) => void;
  onToggleDetail: (index: number, id: RouteDetailId) => void;
}) {
  const selectedDetailsCount = stops.reduce(
    (total, stop) =>
      total + routeDetails.filter(detail => stop.details?.[detail.id]).length,
    0,
  );

  return (
    <div>
      <Field label="Адрес получения" htmlFor="route-address">
        <AddressLookupInput
          id="route-address"
          value={address}
          onChange={onAddressChange}
          placeholder="Куда доставить: адрес, имя получателя, телефон"
          className={inputClass}
        />
      </Field>

      <div className="mt-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-muted">
            Точки забора
          </span>
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
            {stops.length}/{MAX_ROUTE_STOPS}
          </span>
        </div>

        <div className="space-y-3">
          {stops.map((stop, index) => (
            <div
              key={index}
              className="rounded-xl border border-hairline-strong bg-bg/30 p-3"
            >
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <AddressLookupInput
                    value={stop.address ?? ""}
                    onChange={value => onStopChange(index, value)}
                    placeholder={`Точка ${index + 1}: магазин, склад, офис`}
                    className={inputClass}
                  />
                </div>
                {stops.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveStop(index)}
                    aria-label="Удалить точку"
                    className="shrink-0 rounded-xl border border-hairline-strong bg-bg/40 px-3 font-mono text-xs text-ink-dim transition hover:border-brand/50 hover:text-ink"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="mt-3">
                <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
                  Детали точки {index + 1}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1.5">
                  {routeDetails.map(detail => {
                    const selected = Boolean(stop.details?.[detail.id]);
                    return (
                      <button
                        key={detail.id}
                        type="button"
                        onClick={() => onToggleDetail(index, detail.id)}
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                          selected
                            ? "border-brand/60 bg-brand/15 text-ink"
                            : "border-hairline bg-bg/30 text-ink-muted hover:border-brand/40 hover:text-ink"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border font-mono text-[9px] ${
                            selected
                              ? "border-brand bg-brand text-ink"
                              : "border-hairline-strong text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        {detail.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onAddStop}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-brand/40 bg-brand/10 px-3 py-2.5 font-mono text-[10px] uppercase tracking-label text-brand-glow transition hover:border-brand hover:bg-brand/20"
        >
          {stops.length >= MAX_ROUTE_STOPS
            ? "Нужна индивидуальная договоренность"
            : "Добавить точку забора"}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-brand/30 bg-brand/10 p-3 text-xs leading-relaxed text-ink-muted">
        <div className="font-mono text-[10px] uppercase tracking-label text-brand-glow">
          Базовая заявка
        </div>
        <p className="mt-1.5">
          Сейчас можно собрать маршрут до {MAX_ROUTE_STOPS} точек забора.
          Выбрано деталей: {selectedDetailsCount}. Финальный расчет подтвердим
          после уточнения адресов и операций на остановках.
        </p>
      </div>
    </div>
  );
}

function IndividualDealDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/75 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-brand/40 bg-bg-soft p-5 shadow-lifted">
        <div className="font-mono text-[10px] uppercase tracking-label text-brand-glow">
          Индивидуальная договоренность
        </div>
        <h4 className="mt-3 font-display text-2xl leading-none text-ink">
          Маршрут на 3+ точки лучше согласовать лично.
        </h4>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Позвоните нам, и мы быстро подберем формат, цену и порядок выполнения.
        </p>
        <a
          href={supportPhoneHref}
          className="mt-5 flex w-full items-center justify-center rounded-full bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-label text-bg transition hover:bg-brand hover:text-ink"
        >
          Позвонить {supportPhone}
        </a>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-full border border-hairline-strong px-5 py-3 font-mono text-[11px] uppercase tracking-label text-ink-muted transition hover:text-ink"
        >
          Вернуться к заявке
        </button>
      </div>
    </div>
  );
}

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
        className="mb-1.5 block font-mono text-[10px] uppercase tracking-label text-ink-muted"
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
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-label text-ink-dim">
        {zone.name}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {points.map(p => {
          const selected = selectedIds.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              className={`rounded-full border px-2.5 py-1 text-left font-mono text-[11px] transition ${
                selected
                  ? "border-brand bg-brand/20 text-ink"
                  : "border-hairline-strong bg-bg/40 text-ink-muted hover:border-brand/40 hover:text-ink"
              }`}
            >
              {p.name}
              {p.delivery_service && (
                <span className="ml-1.5 text-[10px] text-ink-dim">
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
    <div className="rounded-xl border border-dashed border-hairline-strong bg-bg/30 p-4 text-center">
      <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
        Результат
      </div>
      <p className="mt-1.5 text-xs text-ink-muted">
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
    win: `Экономия ${formatCzk(savings)} · ${savingsPct}%`,
    lose: `Skoro дороже на ${formatCzk(-savings)}`,
    neutral: "Цены сопоставимы",
  }[tone];

  return (
    <div>
      {/* Две колонки: их доставка vs Skoro */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-hairline-strong bg-hairline-strong">
        <CostColumn
          label="Их доставка"
          sub="суммарно по точкам"
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
        className={`mt-2 flex items-center justify-center rounded-xl border px-3 py-2 font-mono text-[11px] uppercase tracking-label ${toneClasses}`}
      >
        {toneTitle}
      </div>

      {/* Раскрывашка с детализацией */}
      <details className="mt-3 group">
        <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-label text-ink-dim transition hover:text-ink-muted">
          <span className="inline-block transition group-open:rotate-90">▸</span>{" "}
          Подробности
        </summary>

        <div className="mt-2 grid grid-cols-1 gap-2">
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

function PricingNotice() {
  return (
    <div className="mt-3 rounded-xl border border-brand/30 bg-brand/10 p-3 text-xs leading-relaxed text-ink-muted">
      <div className="font-mono text-[10px] uppercase tracking-label text-brand-glow">
        Важно по расчету
      </div>
      <p className="mt-1.5">
        Прайс multi-stop Skoro рассчитан для готовых к забору заказов.
        Операционные работы оплачиваются отдельно по тарифу.{" "}
        <a
          href="#tariffs"
          className="text-ink underline decoration-brand-glow/60 underline-offset-4 transition hover:text-brand-glow"
        >
          Ознакомиться
        </a>
      </p>
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
    <div className={`flex flex-col gap-1.5 p-3 ${accent ? "bg-bg" : "bg-bg-soft/90"}`}>
      <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
        {label}
      </div>
      <div
        className={`font-display text-2xl leading-none md:text-3xl ${
          accent ? "text-brand-glow" : "text-ink"
        }`}
      >
        {formatCzk(amount)}
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
    <div className="rounded-lg border border-hairline bg-bg/40 p-2.5">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-label text-ink-dim">
        {title}
      </div>
      <ul className="space-y-1 text-xs text-ink-muted">
        {items.map((it, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span className="truncate">{it.label}</span>
            <span className="shrink-0 font-mono tabular-nums text-ink">
              {formatCzk(it.amount)}
            </span>
          </li>
        ))}
        <li className="mt-1.5 flex items-baseline justify-between border-t border-hairline pt-1.5 font-mono text-[10px] uppercase tracking-label text-ink">
          <span>Итого</span>
          <span className="tabular-nums">{formatCzk(total)}</span>
        </li>
      </ul>
    </div>
  );
}

function CalculatorSkeleton() {
  return (
    <div className="rounded-2xl border border-hairline-strong bg-bg-soft/60 p-5">
      <div className="h-5 w-1/2 animate-pulse rounded bg-bg-raised/60" />
      <div className="mt-4 space-y-2">
        <div className="h-3.5 w-full animate-pulse rounded bg-bg-raised/40" />
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-bg-raised/40" />
        <div className="h-3.5 w-3/5 animate-pulse rounded bg-bg-raised/40" />
      </div>
    </div>
  );
}
