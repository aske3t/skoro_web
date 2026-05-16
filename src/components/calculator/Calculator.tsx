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
  ServiceCost,
  RouteUnit,
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

const MAX_UNITS = 3
const BATCH_PER_EXTRA_STOP = 100;
const supportPhone = "+420 795 402 571";
const supportPhoneHref = "tel:+420795402571";

//создание юнита
function createRouteUnit(defaultSlotId: string): RouteUnit {
  return {
    pickup: {
      address: "",
      location: null,
      zoneId: null,
      slotId: defaultSlotId,
      surcharge: { weight15: false, buyoutTier: "none", docTier: "none" },
    },
    recipient: { address: "", location: null },
    recipientSameAs: null,
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
  const [location, setLocation] = useState<AddressLocation | null>(null);
  const [slotId, setSlotId] = useState<string>("");
  const [units, setUnits] = useState<RouteUnit[]>([]);
  const [batchEnabled, setBatchEnabled] = useState(false);
  const [showIndividualDeal, setShowIndividualDeal] = useState(false);

  // Загрузка справочников + выбор первой зоны как дефолта.
  useEffect(() => {
    loadCalculatorData()
      .then(d => {
        setData(d);
        setZoneId(d.zones[0]?.id ?? "");
        const defaultSlot =
          d.slots.find(s => s.slug === "slot_3h")?.id ?? d.slots[0]?.id ?? "";
        setSlotId(defaultSlot);
        setUnits([createRouteUnit(defaultSlot)]);
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

  function addUnit() {
    if (units.length >= MAX_UNITS) {
      setShowIndividualDeal(true);
      return;
    }
    setUnits(prev => [
      ...prev,
      createRouteUnit(prev[prev.length - 1]?.pickup.slotId ?? slotId),
    ]);
  }

  function removeUnit(index: number) {
    setUnits(prev => {
      if (prev.length === 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      // чистим висячие/сдвинутые ссылки recipientSameAs
      return next.map(u => {
        if (u.recipientSameAs === null) return u;
        if (u.recipientSameAs === index) return { ...u, recipientSameAs: null };
        if (u.recipientSameAs > index)
          return { ...u, recipientSameAs: u.recipientSameAs - 1 };
        return u;
      });
    });
  }

  function updatePickupAddress(
    index: number, addr: string, loc: AddressLocation | null,
  ) {
    if (!data) return;
    const zoneId = loc ? findClosestZone(loc, data.zones) : null;
    setUnits(prev => prev.map((u, i) =>
      i === index
        ? { ...u, pickup: { ...u.pickup, address: addr, location: loc, zoneId } }
        : u
    ));
  }

  function updatePickupSlot(index: number, newSlotId: string) {
    setUnits(prev => prev.map((u, i) =>
      i === index ? { ...u, pickup: { ...u.pickup, slotId: newSlotId } } : u
    ));
  }

  function updatePickupSurcharge<K extends keyof StopSurcharge>(
    index: number, field: K, value: StopSurcharge[K],
  ) {
    setUnits(prev => prev.map((u, i) =>
      i === index
        ? { ...u, pickup: {
            ...u.pickup,
            surcharge: { ...u.pickup.surcharge, [field]: value }
          } }
        : u
    ));
  }

  function updateRecipient(
    index: number, addr: string, loc: AddressLocation | null,
  ) {
    setUnits(prev => prev.map((u, i) =>
      i === index ? { ...u, recipient: { address: addr, location: loc } } : u
    ));
  }

  // Чекбокс «тот же адрес как у юнита N»: копируем recipient из юнита-донора.
  function toggleSameAddress(index: number, sameAs: number | null) {
    setUnits(prev => prev.map((u, i) => {
      if (i !== index) return u;
      if (sameAs === null) return { ...u, recipientSameAs: null };
      const donor = prev[sameAs];
      if (!donor) return u;
      return {
        ...u,
        recipient: { ...donor.recipient },
        recipientSameAs: sameAs,
      };
    }));
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
    () => isBatchEligible(units),
    [units],
  );

  // Авто-сброс batch если потеряли eligibility
  useEffect(() => {
    if (!batchEligible && batchEnabled) setBatchEnabled(false);
  }, [batchEligible, batchEnabled]);

  const routeResult = useMemo<ServiceCost | null>(() => {
    if (!data || units.every(u => !u.pickup.address)) return null;
    return calcRoute(data, { units, batch: batchEnabled });
  }, [data, units, batchEnabled]);

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
          units={units}
          batchEnabled={batchEnabled}
          batchEligible={batchEligible}
          result={routeResult}
          onAddUnit={addUnit}
          onRemoveUnit={removeUnit}
          onPickupAddressChange={updatePickupAddress}
          onPickupSlotChange={updatePickupSlot}
          onPickupSurchargeChange={updatePickupSurcharge}
          onRecipientChange={updateRecipient}
          onSameAddressToggle={toggleSameAddress}
          onBatchChange={setBatchEnabled}
        />
      )}

      {showIndividualDeal && (
        <IndividualDealDialog
          title="Маршрут на 3+ юнита"
          body="Маршрут с большим числом юнитов удобнее согласовать лично — подберём порядок и оптимальный темп."
          onClose={() => setShowIndividualDeal(false)}
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
  units: RouteUnit[];
  batchEnabled: boolean;
  batchEligible: boolean;
  result: ServiceCost | null;
  onAddUnit: () => void;
  onRemoveUnit: (index: number) => void;
  onPickupAddressChange: (
    index: number, addr: string, loc: AddressLocation | null,
  ) => void;
  onPickupSlotChange: (index: number, slotId: string) => void;
  onPickupSurchargeChange: <K extends keyof StopSurcharge>(
    index: number, field: K, value: StopSurcharge[K],
  ) => void;
  onRecipientChange: (
    index: number, addr: string, loc: AddressLocation | null,
  ) => void;
  onSameAddressToggle: (index: number, sameAs: number | null) => void;
  onBatchChange: (value: boolean) => void;
};

function RouteBuilderMode({
  slots,
  units,
  batchEnabled,
  batchEligible,
  result,
  onAddUnit,
  onRemoveUnit,
  onPickupAddressChange,
  onPickupSlotChange,
  onPickupSurchargeChange,
  onRecipientChange,
  onSameAddressToggle,
  onBatchChange,
}: RouteBuilderProps) {
  return (
    <div>
      {/* Юниты */}
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-label text-ink-muted">
          Юниты доставки
        </span>
        <span className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
          {units.length}/{MAX_UNITS}
        </span>
      </div>

      <div className="space-y-3">
        {units.map((unit, index) => (
          <RouteUnitCard
            key={index}
            index={index}
            unit={unit}
            units={units}
            slots={slots}
            isOnly={units.length === 1}
            onPickupAddressChange={(addr, loc) =>
              onPickupAddressChange(index, addr, loc)
            }
            onPickupSlotChange={slotId => onPickupSlotChange(index, slotId)}
            onPickupSurchargeChange={(field, value) =>
              onPickupSurchargeChange(index, field, value)
            }
            onRecipientChange={(addr, loc) =>
              onRecipientChange(index, addr, loc)
            }
            onSameAddressToggle={sameAs =>
              onSameAddressToggle(index, sameAs)
            }
            onRemove={() => onRemoveUnit(index)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onAddUnit}
        className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-brand/40 bg-brand/10 px-3 py-2.5 font-mono text-[10px] uppercase tracking-label text-brand-glow transition hover:border-brand hover:bg-brand/20"
      >
        {units.length >= MAX_UNITS
          ? "Нужна индивидуальная договоренность"
          : "Добавить юнит"}
      </button>

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
      ) : units.length >= 2 ? (
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

function RouteUnitCard({
  index,
  unit,
  units,
  slots,
  isOnly,
  onPickupAddressChange,
  onPickupSlotChange,
  onPickupSurchargeChange,
  onRecipientChange,
  onSameAddressToggle,
  onRemove,
}: {
  index: number;
  unit: RouteUnit;
  units: RouteUnit[];
  slots: CalculatorData["slots"];
  isOnly: boolean;
  onPickupAddressChange: (addr: string, loc: AddressLocation | null) => void;
  onPickupSlotChange: (slotId: string) => void;
  onPickupSurchargeChange: <K extends keyof StopSurcharge>(
    field: K, value: StopSurcharge[K],
  ) => void;
  onRecipientChange: (addr: string, loc: AddressLocation | null) => void;
  onSameAddressToggle: (sameAs: number | null) => void;
  onRemove: () => void;
}) {
  const canShareRecipient = index > 0;
  const sharing = unit.recipientSameAs !== null;

  return (
    <div className="rounded-xl border border-hairline-strong bg-bg/30 p-3">
      {/* Unit header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-label text-ink-muted">
          Юнит {index + 1}
        </span>
        {!isOnly && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Удалить юнит"
            className="rounded-md border border-hairline-strong bg-bg/40 px-2 font-mono text-xs text-ink-dim transition hover:border-brand/50 hover:text-ink"
          >
            ×
          </button>
        )}
      </div>

      {/* ① Откуда забрать */}
      <div className="mt-3">
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-label text-ink-dim">
          ① Откуда забрать
        </div>
        <AddressAutocomplete
          value={unit.pickup.address}
          onChange={onPickupAddressChange}
          placeholder={`Точка забора ${index + 1}: магазин, склад`}
          className={inputClass}
        />

        {/* slot picker */}
        <div className="mt-2.5">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-label text-ink-dim">
            Слот для этой точки
          </div>
          <div
            role="radiogroup"
            aria-label="Слот точки"
            className="grid grid-cols-3 gap-1 rounded-lg border border-hairline-strong bg-bg/40 p-1"
          >
            {slots.map(s => {
              const selected = unit.pickup.slotId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onPickupSlotChange(s.id)}
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
            active={unit.pickup.surcharge.weight15}
            label="Вес свыше 15 кг"
            priceLabel="+50 Kč"
            onToggle={() =>
              onPickupSurchargeChange("weight15", !unit.pickup.surcharge.weight15)
            }
          />
          <SurchargeTierPicker
            title="Позиции по выкупу"
            tiers={BUYOUT_TIERS}
            currentId={unit.pickup.surcharge.buyoutTier}
            onChange={id => onPickupSurchargeChange("buyoutTier", id)}
          />
          <SurchargeTierPicker
            title="Доверенность"
            tiers={DOC_TIERS}
            currentId={unit.pickup.surcharge.docTier}
            onChange={id => onPickupSurchargeChange("docTier", id)}
          />
        </div>
      </div>

      {/* ② Куда доставить */}
      <div className="mt-4 border-t border-hairline pt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
            ② Куда доставить
          </span>
          {canShareRecipient && (
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-ink-muted transition hover:text-ink">
              <input
                type="checkbox"
                checked={sharing}
                onChange={e => onSameAddressToggle(e.target.checked ? 0 : null)}
                className="h-3.5 w-3.5 accent-brand"
              />
              как у юнита 1
            </label>
          )}
        </div>

        <AddressAutocomplete
          value={unit.recipient.address}
          onChange={onRecipientChange}
          placeholder={`Получатель ${index + 1}: адрес, имя, телефон`}
          className={inputClass}
        />
        {sharing && units[unit.recipientSameAs!] && (
          <p className="mt-1.5 font-mono text-[10px] text-ink-dim">
            Скопировано из юнита 1.
          </p>
        )}
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
