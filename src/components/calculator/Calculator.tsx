"use client";

import { useEffect, useMemo, useState } from "react";
import AddressAutocomplete from "../googleautocomplete";
import { loadCalculatorData } from "@/lib/calculator/data";
import { compare, calcRoute, isBatchEligible } from "@/lib/calculator/pricing";
import { BUYOUT_TIERS, DOC_TIERS } from "@/lib/calculator/surcharges";
import { findClosestZone } from "@/lib/maps/zones";
import type {
  CalculatorData,
  CalculatorResult,
  RetailPoint,
  Zone,
  StopSurcharge,
  BuyoutTierId,
  DocWorkTier,
  RouteRecipient,
  RouteStop,
  ServiceCost,
} from "@/lib/calculator/types";
import { AddressLocation } from "@/lib/maps/adressAutocomplete";

// Чешские кроны: режим `currency` сам подставит "Kč" и расставит разделители.
const czkFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
});
const formatCzk = (n: number) => czkFormatter.format(n);

type CalculatorMode = "compare" | "route";

const MAX_PICKUP_STOPS = 3;
const MAX_RECIPIENTS = 3;
const BATCH_PER_EXTRA_STOP = 100;
const supportPhone = "+420 795 402 571";
const supportPhoneHref = "tel:+420795402571";

function createRouteStop(defaultSlotId: string): RouteStop {
  return {
    address: "",
    location: null,
    zoneId: null,
    slotId: defaultSlotId,
    surcharge: { weight15: false, buyoutTier: "none", docTier: "none" },
  };
}

function createRouteRecipient(): RouteRecipient {
  return { address: "", location: null };
}

export default function Calculator() {
  const [data, setData] = useState<CalculatorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<CalculatorMode>("compare");

  // Form state
  const [pickupIds, setPickupIds] = useState<string[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [location, setLocation] = useState<AddressLocation | null>(null);
  const [slotId, setSlotId] = useState<string>("");
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [recipients, setRecipients] = useState<RouteRecipient[]>([
    createRouteRecipient(),
  ]);
  const [batchEnabled, setBatchEnabled] = useState(false);
  const [showIndividualDeal, setShowIndividualDeal] = useState(false);
  const [showRecipientLimitDialog, setShowRecipientLimitDialog] = useState(false);

  // Загрузка справочников + выбор первой зоны как дефолта.
  useEffect(() => {
    loadCalculatorData()
      .then(d => {
        setData(d);
        setZoneId(d.zones[0]?.id ?? "");
        const defaultSlot =
          d.slots.find(s => s.slug === "slot_3h")?.id ?? d.slots[0]?.id ?? "";
        setSlotId(defaultSlot);
        setRouteStops([createRouteStop(defaultSlot)]);
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

  function updateRouteStopField<K extends keyof RouteStop>(
    index: number, field: K, value: RouteStop[K],
  ) {
    setRouteStops(prev =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  }

  function updateStopAddress(
    index: number, addr: string, loc: AddressLocation | null,
  ) {
    if (!data) return;
    const zoneId = loc ? findClosestZone(loc, data.zones) : null;
    setRouteStops(prev =>
      prev.map((s, i) =>
        i === index ? { ...s, address: addr, location: loc, zoneId } : s,
      ),
    );
  }

  function updateStopSurcharge<K extends keyof StopSurcharge>(
    stopIndex: number, field: K, value: StopSurcharge[K],
  ) {
    setRouteStops(prev =>
      prev.map((s, i) =>
        i === stopIndex
          ? { ...s, surcharge: { ...s.surcharge, [field]: value } }
          : s,
      ),
    );
  }

  function addRouteStop() {
    if (routeStops.length >= MAX_PICKUP_STOPS) {
      setShowIndividualDeal(true);
      return;
    }
    setRouteStops(prev => [
      ...prev,
      createRouteStop(prev[prev.length - 1]?.slotId ?? slotId),
    ]);
    if (routeStops.length + 1 >= MAX_PICKUP_STOPS) {
      setShowIndividualDeal(true);
    }
  }

  function removeRouteStop(index: number) {
    setRouteStops(prev =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  function addRecipient() {
    if (recipients.length >= MAX_RECIPIENTS) {
      setShowRecipientLimitDialog(true);
      return;
    }
    setRecipients(prev => [...prev, createRouteRecipient()]);
  }

  function removeRecipient(index: number) {
    setRecipients(prev =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  function updateRecipient(index: number, patch: Partial<RouteRecipient>) {
    setRecipients(prev =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  // Compare result
  const result = useMemo<CalculatorResult | null>(() => {
    if (!data || !zoneId || pickupIds.length === 0 || !slotId) return null;
    return compare(data, {
      pickupPointIds: pickupIds,
      deliveryZoneId: zoneId,
      deliveryLocation: location,
      slotId,
    });
  }, [data, zoneId, pickupIds, slotId, location]);

  // Route eligibility и расчёт
  const batchEligible = useMemo(
    () => isBatchEligible(routeStops),
    [routeStops],
  );

  // Авто-сброс batch если потеряли eligibility
  useEffect(() => {
    if (!batchEligible && batchEnabled) setBatchEnabled(false);
  }, [batchEligible, batchEnabled]);

  const routeResult = useMemo<ServiceCost | null>(() => {
    if (!data || routeStops.every(s => !s.address)) return null;
    return calcRoute(data, {
      stops: routeStops,
      batch: batchEnabled,
      recipients,
    });
  }, [data, routeStops, batchEnabled, recipients]);

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
          slotId={slotId}
          onSlotChange={setSlotId}
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
          slots={data.slots}
          stops={routeStops}
          recipients={recipients}
          batchEnabled={batchEnabled}
          batchEligible={batchEligible}
          result={routeResult}
          onAddStop={addRouteStop}
          onRemoveStop={removeRouteStop}
          onStopAddressChange={updateStopAddress}
          onStopSlotChange={(i, slotId) =>
            updateRouteStopField(i, "slotId", slotId)
          }
          onStopSurchargeChange={updateStopSurcharge}
          onAddRecipient={addRecipient}
          onRemoveRecipient={removeRecipient}
          onUpdateRecipient={updateRecipient}
          onBatchChange={setBatchEnabled}
        />
      )}

      {showIndividualDeal && (
        <IndividualDealDialog
          title="Маршрут на 3+ точки"
          body="Маршрут с большим числом точек забора удобнее согласовать лично — подберём порядок и оптимальный темп."
          onClose={() => setShowIndividualDeal(false)}
        />
      )}

      {showRecipientLimitDialog && (
        <IndividualDealDialog
          title="Доставка на 3+ адресов"
          body="Маршрут с несколькими получателями лучше согласовать лично — поможем со сроками и приоритетами."
          onClose={() => setShowRecipientLimitDialog(false)}
        />
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
  slotId,
  onSlotChange,
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
  slotId: string;
  onSlotChange: (id: string) => void;
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
        <AddressAutocomplete
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

      {/* Слот доставки */}
      <div className="mt-3">
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-label text-ink-muted">
          Когда доставить
        </span>
        <div
          role="radiogroup"
          aria-label="Слот доставки"
          className="grid grid-cols-3 gap-1 rounded-xl border border-hairline-strong bg-bg/40 p-1"
        >
          {data.slots.map(s => {
            const selected = slotId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSlotChange(s.id)}
                title={s.sub_label ?? undefined}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-center font-mono text-[10px] uppercase tracking-label transition ${
                  selected
                    ? "bg-brand text-ink shadow-brand"
                    : "text-ink-dim hover:bg-ink/5 hover:text-ink"
                }`}
              >
                <span className="leading-tight">{s.label}</span>
                <span
                  className={`text-[9px] tabular-nums ${
                    selected ? "text-ink/80" : "text-ink-dim"
                  }`}
                >
                  {formatCzk(s.base_price)}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-2 flex items-start gap-1.5 font-mono text-[10px] leading-snug text-ink-dim">
          <span aria-hidden className="mt-0.5 text-brand-glow">*</span>
          Часть конкурентов не доставляет в день заказа — фактическая выдача
          может прийтись на следующий день.
        </p>
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

type RouteBuilderProps = {
  slots: CalculatorData["slots"];
  stops: RouteStop[];
  recipients: RouteRecipient[];
  batchEnabled: boolean;
  batchEligible: boolean;
  result: ServiceCost | null;
  onAddStop: () => void;
  onRemoveStop: (index: number) => void;
  onStopAddressChange: (
    index: number, addr: string, loc: AddressLocation | null,
  ) => void;
  onStopSlotChange: (index: number, slotId: string) => void;
  onStopSurchargeChange: <K extends keyof StopSurcharge>(
    stopIndex: number, field: K, value: StopSurcharge[K],
  ) => void;
  onAddRecipient: () => void;
  onRemoveRecipient: (index: number) => void;
  onUpdateRecipient: (index: number, patch: Partial<RouteRecipient>) => void;
  onBatchChange: (value: boolean) => void;
};

function RouteBuilderMode({
  slots,
  stops,
  recipients,
  batchEnabled,
  batchEligible,
  result,
  onAddStop,
  onRemoveStop,
  onStopAddressChange,
  onStopSlotChange,
  onStopSurchargeChange,
  onAddRecipient,
  onRemoveRecipient,
  onUpdateRecipient,
  onBatchChange,
}: RouteBuilderProps) {
  return (
    <div>
      {/* Точки забора */}
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-muted">
            Точки забора
          </span>
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
            {stops.length}/{MAX_PICKUP_STOPS}
          </span>
        </div>

        <div className="space-y-3">
          {stops.map((stop, index) => (
            <RouteStopCard
              key={index}
              index={index}
              stop={stop}
              slots={slots}
              isOnly={stops.length === 1}
              onAddressChange={(addr, loc) => onStopAddressChange(index, addr, loc)}
              onSlotChange={slotId => onStopSlotChange(index, slotId)}
              onSurchargeChange={(field, value) =>
                onStopSurchargeChange(index, field, value)
              }
              onRemove={() => onRemoveStop(index)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onAddStop}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-brand/40 bg-brand/10 px-3 py-2.5 font-mono text-[10px] uppercase tracking-label text-brand-glow transition hover:border-brand hover:bg-brand/20"
        >
          {stops.length >= MAX_PICKUP_STOPS
            ? "Нужна индивидуальная договоренность"
            : "Добавить точку забора"}
        </button>
      </div>

      {/* Адреса доставки */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-muted">
            Адреса доставки
          </span>
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
            {recipients.length}/{MAX_RECIPIENTS}
          </span>
        </div>

        <div className="space-y-2">
          {recipients.map((r, i) => (
            <div key={i} className="flex gap-2">
              <div className="min-w-0 flex-1">
                <AddressAutocomplete
                  value={r.address}
                  onChange={(addr, loc) =>
                    onUpdateRecipient(i, { address: addr, location: loc })
                  }
                  placeholder={`Получатель ${i + 1}: адрес, имя, телефон`}
                  className={inputClass}
                />
              </div>
              {recipients.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveRecipient(i)}
                  aria-label="Удалить получателя"
                  className="shrink-0 rounded-xl border border-hairline-strong bg-bg/40 px-3 font-mono text-xs text-ink-dim transition hover:border-brand/50 hover:text-ink"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onAddRecipient}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-brand/40 bg-brand/10 px-3 py-2.5 font-mono text-[10px] uppercase tracking-label text-brand-glow transition hover:border-brand hover:bg-brand/20"
        >
          {recipients.length >= MAX_RECIPIENTS
            ? "Нужна индивидуальная договоренность"
            : "Добавить получателя"}
        </button>
      </div>

      {/* Batch toggle / hint */}
      {batchEligible ? (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-brand/40 bg-brand/10 p-3 transition hover:bg-brand/15">
          <input
            type="checkbox"
            checked={batchEnabled}
            onChange={e => onBatchChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand"
          />
          <div>
            <div className="font-mono text-[10px] uppercase tracking-label text-brand-glow">
              Объединить в batch
            </div>
            <p className="mt-1 text-xs leading-snug text-ink-muted">
              База одного слота + {BATCH_PER_EXTRA_STOP}&nbsp;Kč за каждую
              дополнительную точку забора. Применимо, когда все точки в одном
              районе и с одинаковым слотом.
            </p>
          </div>
        </label>
      ) : stops.length >= 2 ? (
        <p className="mt-3 flex items-start gap-1.5 font-mono text-[10px] leading-snug text-ink-dim">
          <span aria-hidden className="mt-0.5 text-brand-glow">*</span>
          Batch-расчёт станет доступен, когда все точки забора окажутся в одной
          зоне и с одинаковым слотом.
        </p>
      ) : null}

      {/* Result */}
      <div className="my-4 h-px w-full bg-hairline-strong" />
      {result && result.total > 0 ? (
        <RouteResultPanel result={result} />
      ) : (
        <ResultPlaceholder />
      )}
    </div>
  );
}

function RouteStopCard({
  index,
  stop,
  slots,
  isOnly,
  onAddressChange,
  onSlotChange,
  onSurchargeChange,
  onRemove,
}: {
  index: number;
  stop: RouteStop;
  slots: CalculatorData["slots"];
  isOnly: boolean;
  onAddressChange: (addr: string, loc: AddressLocation | null) => void;
  onSlotChange: (slotId: string) => void;
  onSurchargeChange: <K extends keyof StopSurcharge>(
    field: K, value: StopSurcharge[K],
  ) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-hairline-strong bg-bg/30 p-3">
      {/* address */}
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <AddressAutocomplete
            value={stop.address}
            onChange={onAddressChange}
            placeholder={`Точка ${index + 1}: магазин, склад, офис`}
            className={inputClass}
          />
        </div>
        {!isOnly && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Удалить точку"
            className="shrink-0 rounded-xl border border-hairline-strong bg-bg/40 px-3 font-mono text-xs text-ink-dim transition hover:border-brand/50 hover:text-ink"
          >
            ×
          </button>
        )}
      </div>

      {/* per-stop slot */}
      <div className="mt-3">
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-label text-ink-dim">
          Слот для этой точки
        </div>
        <div
          role="radiogroup"
          aria-label="Слот точки"
          className="grid grid-cols-3 gap-1 rounded-lg border border-hairline-strong bg-bg/40 p-1"
        >
          {slots.map(s => {
            const selected = stop.slotId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSlotChange(s.id)}
                className={`rounded-md px-2 py-1.5 text-center font-mono text-[9px] uppercase leading-tight tracking-label transition ${
                  selected
                    ? "bg-brand text-ink"
                    : "text-ink-dim hover:bg-ink/5 hover:text-ink"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* surcharges */}
      <div className="mt-3 space-y-2">
        <SurchargeToggle
          active={stop.surcharge.weight15}
          label="Вес свыше 15 кг"
          priceLabel="+50 Kč"
          onToggle={() =>
            onSurchargeChange("weight15", !stop.surcharge.weight15)
          }
        />
        <SurchargeTierPicker
          title="Позиции по выкупу"
          tiers={BUYOUT_TIERS}
          currentId={stop.surcharge.buyoutTier}
          onChange={id => onSurchargeChange("buyoutTier", id)}
        />
        <SurchargeTierPicker
          title="Доверенность"
          tiers={DOC_TIERS}
          currentId={stop.surcharge.docTier}
          onChange={id => onSurchargeChange("docTier", id)}
        />
      </div>
    </div>
  );
}

function SurchargeToggle({
  active, label, priceLabel, onToggle,
}: {
  active: boolean;
  label: string;
  priceLabel: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition ${
        active
          ? "border-brand/60 bg-brand/15 text-ink"
          : "border-hairline bg-bg/30 text-ink-muted hover:border-brand/40 hover:text-ink"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border font-mono text-[9px] ${
            active
              ? "border-brand bg-brand text-ink"
              : "border-hairline-strong text-transparent"
          }`}
        >
          ✓
        </span>
        {label}
      </span>
      <span className="font-mono text-[10px] tabular-nums text-ink-dim">
        {priceLabel}
      </span>
    </button>
  );
}

function SurchargeTierPicker<T extends string>({
  title, tiers, currentId, onChange,
}: {
  title: string;
  tiers: { id: T; label: string; price: number }[];
  currentId: T;
  onChange: (id: T) => void;
}) {
  const current = tiers.find(t => t.id === currentId) ?? tiers[0];
  const isActive = current.price > 0;

  return (
    <details className="group rounded-lg border border-hairline bg-bg/30 open:border-brand/40">
      <summary
        className={`flex cursor-pointer items-center justify-between gap-2 px-2.5 py-2 text-xs transition ${
          isActive ? "text-ink" : "text-ink-muted hover:text-ink"
        }`}
      >
        <span className="flex items-center gap-2">
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border font-mono text-[9px] ${
              isActive
                ? "border-brand bg-brand text-ink"
                : "border-hairline-strong text-transparent"
            }`}
          >
            ✓
          </span>
          {title}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums text-ink-dim">
          {isActive ? `+${current.price} Kč` : "—"}
          <span className="inline-block transition group-open:rotate-90">▸</span>
        </span>
      </summary>
      <div className="grid grid-cols-1 gap-1 border-t border-hairline p-2">
        {tiers.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition ${
              t.id === currentId
                ? "bg-brand/15 text-ink"
                : "text-ink-muted hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <span>{t.label}</span>
            <span className="font-mono text-[10px] tabular-nums text-ink-dim">
              {t.price > 0 ? `+${t.price} Kč` : "—"}
            </span>
          </button>
        ))}
      </div>
    </details>
  );
}

function RouteResultPanel({ result }: { result: ServiceCost }) {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-hairline-strong bg-bg/40 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
            Skoro · маршрут
          </div>
          <div className="font-display text-2xl leading-none text-brand-glow md:text-3xl">
            {formatCzk(result.total)}
          </div>
        </div>

        <details className="mt-3 group">
          <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-label text-ink-dim transition hover:text-ink-muted">
            <span className="inline-block transition group-open:rotate-90">▸</span>{" "}
            Подробности
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-ink-muted">
            {result.breakdown.map((it, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span className="truncate">{it.label}</span>
                <span className="shrink-0 font-mono tabular-nums text-ink">
                  {formatCzk(it.amount)}
                </span>
              </li>
            ))}
            <li className="mt-1.5 flex items-baseline justify-between border-t border-hairline pt-1.5 font-mono text-[10px] uppercase tracking-label text-ink">
              <span>Итого</span>
              <span className="tabular-nums">{formatCzk(result.total)}</span>
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
}

function IndividualDealDialog({
  title,
  body,
  onClose,
}: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/75 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-brand/40 bg-bg-soft p-5 shadow-lifted">
        <div className="font-mono text-[10px] uppercase tracking-label text-brand-glow">
          Индивидуальная договоренность
        </div>
        <h4 className="mt-3 font-display text-2xl leading-none text-ink">
          {title}
        </h4>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          {body}
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
