"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Phone, Plus, X } from "lucide-react";
import AddressAutocomplete from "../googleautocomplete";
import { loadCalculatorData } from "@/lib/calculator/data";
import { compare, calcRoute, isBatchEligible } from "@/lib/calculator/pricing";
import {
  BUYOUT_TIERS,
  DOC_TIERS,
  WEIGHT_SURCHARGE,
  calcStopSurcharge,
} from "@/lib/calculator/surcharges";
import { requestLeadPrefill } from "@/lib/leads/prefill";
import { findClosestZone } from "@/lib/maps/zones";
import type {
  CalculatorData,
  CalculatorResult,
  CostBreakdownItem,
  DeliverySlot,
  RetailPoint,
  Zone,
  StopSurcharge,
  ServiceCost,
  RouteUnit,
} from "@/lib/calculator/types";
import type { AddressLocation } from "@/lib/maps/adressAutocomplete";

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

// Режимы называются по задаче клиента; подсказка под переключателем объясняет, что считаем.
const MODES: { id: CalculatorMode; title: string; hint: string }[] = [
  {
    id: "compare",
    title: "Из магазинов",
    hint: "Курьер заберёт заказы из нескольких магазинов за один рейс. Сравним с их собственной доставкой.",
  },
  {
    id: "route",
    title: "Свои адреса",
    hint: "Ваши точки забора и доставки: склад, офис, клиенты. До трёх доставок в одном расчёте.",
  },
];

// Короткие названия слотов для переключателя; полные — в БД и в секции «Тарифы».
const SLOT_TITLE: Record<string, string> = {
  express: "Экспресс",
  slot_3h: "За 3 часа",
  slot_day: "За день",
};
// Тариф определяется запасом времени: от заявки до выбранного клиентом времени доставки.
const SLOT_HINT: Record<string, string> = {
  express: "Доставим в течение часа после заявки",
  slot_3h: "Вы выбираете время доставки в пределах 3 часов после заявки",
  slot_day: "Время доставки — позже, чем через 3 часа после заявки",
};
const slotTitle = (s: DeliverySlot) => SLOT_TITLE[s.slug] ?? s.label;
const slotHint = (s: DeliverySlot) =>
  [SLOT_HINT[s.slug] ?? s.label, s.sub_label].filter(Boolean).join(" · ");

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
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
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

  // Загрузка справочников + выбор первой зоны как дефолта. attempt — повтор после ошибки.
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
        console.error("[calculator] не удалось загрузить тарифы", e);
        setFailed(true);
      });
  }, [attempt]);

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

  // Адрес доставки в сравнении: по выбранной подсказке подбираем зону (её можно сменить вручную).
  function changeDeliveryAddress(addr: string, loc: AddressLocation | null) {
    setAddress(addr);
    setLocation(loc);
    const closest = loc && data ? findClosestZone(loc, data.zones) : null;
    if (closest) setZoneId(closest);
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

  const closeIndividualDeal = useCallback(() => setShowIndividualDeal(false), []);

  // «Оставить заявку с этим расчётом»: сводка уходит в форму как вопрос менеджеру.
  function orderCompare() {
    if (!data || !result) return;
    requestLeadPrefill({
      kind: "question",
      message: compareSummary(data, { pickupIds, slotId, zoneId, address }, result),
    });
  }

  function orderRoute() {
    if (!data || !routeResult) return;
    requestLeadPrefill({
      kind: "question",
      message: routeSummary(data, units, batchEnabled && batchEligible, routeResult),
    });
  }

  if (failed) {
    return (
      <CalculatorError
        onRetry={() => {
          setFailed(false);
          setAttempt(a => a + 1);
        }}
      />
    );
  }

  if (!data) return <CalculatorSkeleton />;

  return (
    <div id="calculator" className="scroll-mt-24 rounded-2xl border border-hairline-strong bg-bg-soft p-4 shadow-card sm:p-6">
      <h3 className="font-display text-2xl leading-tight text-ink">Сколько стоит доставка</h3>

      <ModeSwitch mode={mode} onChange={setMode} />

      <div className="mt-6">
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
            onAddressChange={changeDeliveryAddress}
            onPickupToggle={togglePickup}
            onZoneChange={setZoneId}
            onOrder={orderCompare}
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
            onOrder={orderRoute}
          />
        )}
      </div>

      {showIndividualDeal && <IndividualDealDialog onClose={closeIndividualDeal} />}
    </div>
  );
}

// ── Сводка для формы заявки ─────────────────────────────────────────

function compareSummary(
  data: CalculatorData,
  input: { pickupIds: string[]; slotId: string; zoneId: string; address: string },
  result: CalculatorResult,
): string {
  const points = data.retailPoints
    .filter(p => input.pickupIds.includes(p.id))
    .map(p => p.name)
    .join(", ");
  const slot = data.slots.find(s => s.id === input.slotId);
  const zone = data.zones.find(z => z.id === input.zoneId)?.name;
  const where = [input.address.trim(), zone && `зона ${zone}`].filter(Boolean).join(", ");
  return [
    "Расчёт из калькулятора.",
    `Забрать: ${points}.`,
    slot && `Когда: ${slotTitle(slot)}.`,
    where && `Куда: ${where}.`,
    `Ориентир Skoro: ${formatCzk(result.skoro.total)}.`,
  ].filter(Boolean).join("\n");
}

function routeSummary(
  data: CalculatorData,
  units: RouteUnit[],
  batch: boolean,
  result: ServiceCost,
): string {
  const lines = units.map((u, i) => {
    const slot = data.slots.find(s => s.id === u.pickup.slotId);
    const extras = calcStopSurcharge(u.pickup.surcharge).items.map(it => it.label);
    return [
      `${i + 1}. ${u.pickup.address.trim() || "адрес забора не указан"} → ${u.recipient.address.trim() || "адрес доставки не указан"}`,
      slot && slotTitle(slot),
      ...extras,
    ].filter(Boolean).join(" · ");
  });
  return [
    `Расчёт из калькулятора: ${units.length} ${plural(units.length, ["доставка", "доставки", "доставок"])}.`,
    ...lines,
    batch && "Один рейс: да.",
    `Ориентир Skoro: ${formatCzk(result.total)}.`,
  ].filter(Boolean).join("\n");
}

function plural(n: number, [one, few, many]: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

// Пока расстояния не заполнены (P-18), строки километража нулевые — их не показываем.
// Внутренние названия из формулы (batch) переводим на язык клиента.
function visibleBreakdown(items: CostBreakdownItem[]): CostBreakdownItem[] {
  return items
    .filter(it => it.amount !== 0)
    .map(it => ({
      ...it,
      label: it.label
        .replace(/\s\(0 км\)$/, "")
        .replace(/^Batch · /, "Один рейс · ")
        .replace(/^Доп\. точки в batch/, "Следующие точки забора"),
    }));
}

// ───────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-hairline-strong bg-bg px-3.5 py-3 text-base text-ink placeholder:text-ink-dim transition-colors focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

// Видимый фокус для элементов, где сам input скрыт (sr-only), а рисуется подпись.
const focusRing =
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-glow";

function ModeSwitch({
  mode,
  onChange,
}: {
  mode: CalculatorMode;
  onChange: (mode: CalculatorMode) => void;
}) {
  const name = useId();
  const current = MODES.find(m => m.id === mode) ?? MODES[0];
  return (
    <fieldset className="mt-4">
      <legend className="sr-only">Что посчитать</legend>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-hairline-strong bg-bg p-1">
        {MODES.map(m => (
          <label
            key={m.id}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-3 text-center text-sm font-medium transition-colors ${focusRing} ${
              mode === m.id ? "bg-ink text-bg" : "text-ink-muted hover:text-ink"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={m.id}
              checked={mode === m.id}
              onChange={() => onChange(m.id)}
              aria-describedby={`${name}-hint`}
              className="sr-only"
            />
            {m.title}
          </label>
        ))}
      </div>
      <p id={`${name}-hint`} className="mt-2.5 text-[13px] leading-snug text-ink-muted">
        {current.hint}
      </p>
    </fieldset>
  );
}

function Step({
  title,
  aside,
  className = "",
  children,
}: {
  title: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-medium text-ink">{title}</h4>
        {aside && <span className="text-[13px] tabular-nums text-ink-muted">{aside}</span>}
      </div>
      {children}
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
  onOrder,
}: {
  slotId: string;
  onSlotChange: (id: string) => void;
  address: string;
  data: CalculatorData;
  pointsByZone: Map<string, RetailPoint[]>;
  pickupIds: string[];
  result: CalculatorResult | null;
  zoneId: string;
  onAddressChange: (value: string, location: AddressLocation | null) => void;
  onPickupToggle: (id: string) => void;
  onZoneChange: (value: string) => void;
  onOrder: () => void;
}) {
  return (
    <>
      <Step
        title="Откуда забрать"
        aside={pickupIds.length > 0 ? `Выбрано: ${pickupIds.length}` : undefined}
      >
        <div className="space-y-3">
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
      </Step>

      <Step title="Когда доставить" className="mt-6">
        <SlotPicker
          label="Когда доставить"
          slots={data.slots}
          value={slotId}
          onChange={onSlotChange}
        />
      </Step>

      {/* Адрес и зона пока не меняют цену (километраж — TASK-004), но уходят в заявку */}
      <Step title="Куда доставить" aside="по желанию" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
          <Field label="Адрес" htmlFor="calc-address">
            <AddressAutocomplete
              id="calc-address"
              value={address}
              onChange={onAddressChange}
              placeholder="Улица и номер дома"
              className={inputClass}
            />
          </Field>
          <Field label="Зона" htmlFor="calc-zone">
            <div className="relative">
              <select
                id="calc-zone"
                value={zoneId}
                onChange={e => onZoneChange(e.target.value)}
                className={`${inputClass} cursor-pointer appearance-none pr-10`}
              >
                {data.zones.map(z => (
                  <option key={z.id} value={z.id} className="bg-bg-deep text-ink">
                    {z.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                size={18}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
              />
            </div>
          </Field>
        </div>
      </Step>

      <div className="mt-6 border-t border-hairline-strong pt-5">
        {result ? (
          <ResultPanel result={result} onOrder={onOrder} />
        ) : (
          <p className="text-sm leading-relaxed text-ink-muted">
            Выберите хотя бы один магазин — посчитаем, сколько выйдет с&nbsp;Skoro.
          </p>
        )}
      </div>
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
  onOrder: () => void;
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
  onOrder,
}: RouteBuilderProps) {
  return (
    <div>
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
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-hairline-strong px-4 text-sm font-medium text-ink transition-colors hover:border-brand/60 hover:bg-brand/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-glow"
      >
        {units.length >= MAX_UNITS ? (
          "Больше трёх доставок — согласуем лично"
        ) : (
          <>
            <Plus aria-hidden size={16} />
            Добавить доставку
          </>
        )}
      </button>

      {/* Один рейс (batch): доступен, когда все заборы в одной зоне и с одним слотом */}
      {batchEligible ? (
        <label className={`mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-brand/40 bg-brand/10 p-3.5 transition-colors hover:bg-brand/15 ${focusRing}`}>
          <input
            type="checkbox"
            checked={batchEnabled}
            onChange={e => onBatchChange(e.target.checked)}
            className="sr-only"
          />
          <CheckBox checked={batchEnabled} />
          <span>
            <span className="block text-sm font-medium text-ink">Объединить в один рейс</span>
            <span className="mt-1 block text-[13px] leading-snug text-ink-muted">
              Цена одного слота и +{BATCH_PER_EXTRA_STOP}&nbsp;Kč за каждую следующую точку забора.
            </span>
          </span>
        </label>
      ) : units.length >= 2 ? (
        <p className="mt-3 text-[13px] leading-snug text-ink-muted">
          Посчитаем как один рейс, когда все точки забора окажутся в одной зоне и с одинаковым временем доставки.
        </p>
      ) : null}

      <div className="mt-6 border-t border-hairline-strong pt-5">
        {result && result.total > 0 ? (
          <RouteResultPanel result={result} onOrder={onOrder} />
        ) : (
          <p className="text-sm leading-relaxed text-ink-muted">
            Укажите, откуда забрать, — посчитаем стоимость маршрута.
          </p>
        )}
      </div>
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
  const id = useId();
  const canShareRecipient = index > 0;
  const sharing = unit.recipientSameAs !== null;
  const title = `Доставка ${index + 1}`;

  return (
    <div
      role="group"
      aria-labelledby={`${id}-title`}
      className="rounded-xl border border-hairline-strong bg-bg p-3.5 sm:p-4"
    >
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h4 id={`${id}-title`} className="text-sm font-medium text-ink">{title}</h4>
        {!isOnly && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Удалить: ${title}`}
            className="-mr-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-glow [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
          >
            <X aria-hidden size={18} />
          </button>
        )}
      </div>

      <div className="mt-3">
        <Field label="Откуда забрать" htmlFor={`${id}-pickup`}>
          <AddressAutocomplete
            id={`${id}-pickup`}
            value={unit.pickup.address}
            onChange={onPickupAddressChange}
            placeholder="Магазин, склад или офис"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-4">
        <span className="mb-1.5 block text-[13px] text-ink-muted">Когда доставить</span>
        <SlotPicker
          label={`Когда доставить: ${title}`}
          slots={slots}
          value={unit.pickup.slotId}
          onChange={onPickupSlotChange}
        />
      </div>

      <div className="mt-4">
        <span className="mb-1.5 block text-[13px] text-ink-muted">Дополнительно</span>
        <Extras value={unit.pickup.surcharge} onChange={onPickupSurchargeChange} />
      </div>

      <div className="mt-4 border-t border-hairline pt-4">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <label htmlFor={`${id}-recipient`} className="text-[13px] text-ink-muted">
            Куда доставить
          </label>
          {canShareRecipient && (
            <label className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-md text-[13px] text-ink-muted transition-colors hover:text-ink ${focusRing}`}>
              <input
                type="checkbox"
                checked={sharing}
                onChange={e => onSameAddressToggle(e.target.checked ? 0 : null)}
                className="sr-only"
              />
              <CheckBox checked={sharing} />
              Тот же адрес, что у доставки 1
            </label>
          )}
        </div>

        <AddressAutocomplete
          id={`${id}-recipient`}
          value={unit.recipient.address}
          onChange={onRecipientChange}
          placeholder="Адрес получателя"
          className={inputClass}
        />
        {sharing && units[unit.recipientSameAs!] && (
          <p className="mt-1.5 text-[13px] text-ink-muted">Адрес скопирован из доставки 1.</p>
        )}
      </div>
    </div>
  );
}

// Слоты: нативные радиокнопки — одна остановка Tab, переключение стрелками.
function SlotPicker({
  label,
  slots,
  value,
  onChange,
}: {
  label: string;
  slots: DeliverySlot[];
  value: string;
  onChange: (id: string) => void;
}) {
  const name = useId();
  const selected = slots.find(s => s.id === value);
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-hairline-strong bg-bg p-1">
        {slots.map(s => {
          const checked = s.id === value;
          return (
            <label
              key={s.id}
              className={`flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 py-2 text-center transition-colors ${focusRing} ${
                checked ? "bg-ink text-bg" : "text-ink-muted hover:text-ink"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={s.id}
                checked={checked}
                onChange={() => onChange(s.id)}
                className="sr-only"
              />
              <span className="text-sm font-medium leading-tight">{slotTitle(s)}</span>
              <span className="text-[13px] tabular-nums opacity-80">{formatCzk(s.base_price)}</span>
            </label>
          );
        })}
      </div>
      {selected && (
        <p className="mt-2 text-[13px] leading-snug text-ink-muted">{slotHint(selected)}</p>
      )}
    </fieldset>
  );
}

// Доплаты одной точки: строки с переключателем и ценой справа (Plan Add-on Selector, 21st.dev).
// Уровни выкупа и документов раскрываются, только когда доплата включена.
function Extras({
  value,
  onChange,
}: {
  value: StopSurcharge;
  onChange: <K extends keyof StopSurcharge>(field: K, value: StopSurcharge[K]) => void;
}) {
  return (
    <div className="divide-y divide-hairline-strong rounded-xl border border-hairline-strong">
      <ExtraRow
        title="Вес больше 15 кг"
        price={`+${WEIGHT_SURCHARGE} Kč`}
        checked={value.weight15}
        onToggle={on => onChange("weight15", on)}
      />
      <TierExtra
        title="Выкуп товара"
        description="Курьер купит товар за вас"
        tiers={BUYOUT_TIERS}
        value={value.buyoutTier}
        onChange={id => onChange("buyoutTier", id)}
      />
      <TierExtra
        title="Документы по доверенности"
        description="Подпись, заполнение или заверение на месте"
        tiers={DOC_TIERS}
        value={value.docTier}
        onChange={id => onChange("docTier", id)}
      />
    </div>
  );
}

function ExtraRow({
  title,
  description,
  price,
  checked,
  onToggle,
  children,
}: {
  title: string;
  description?: string;
  price: string;
  checked: boolean;
  onToggle: (on: boolean) => void;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition-colors sm:px-3.5 hover:bg-ink/[0.03] ${focusRing}`}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={e => onToggle(e.target.checked)}
          className="sr-only"
        />
        <CheckBox checked={checked} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink">{title}</span>
          {description && (
            <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{description}</span>
          )}
        </span>
        <span className="shrink-0 whitespace-nowrap text-sm tabular-nums text-ink-muted">{price}</span>
      </label>
      {checked && children}
    </div>
  );
}

function TierExtra<T extends string>({
  title,
  description,
  tiers,
  value,
  onChange,
}: {
  title: string;
  description: string;
  tiers: { id: T; label: string; price: number }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const name = useId();
  const paid = tiers.filter(t => t.price > 0);
  const none = tiers.find(t => t.price === 0) ?? tiers[0];
  const current = tiers.find(t => t.id === value);
  const on = !!current && current.price > 0;

  return (
    <ExtraRow
      title={title}
      description={description}
      price={on ? `+${current.price} Kč` : `от +${paid[0]?.price ?? 0} Kč`}
      checked={on}
      onToggle={next => onChange(next ? paid[0].id : none.id)}
    >
      <fieldset className="grid gap-1 px-3 pb-3 sm:pl-[2.875rem] sm:pr-3.5">
        <legend className="sr-only">{title}: объём</legend>
        {paid.map(t => {
          const checked = t.id === value;
          return (
            <label
              key={t.id}
              className={`flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-[13px] transition-colors ${focusRing} ${
                checked ? "bg-brand/15 text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onChange(t.id)}
                className="sr-only"
              />
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={`h-3.5 w-3.5 shrink-0 rounded-full border transition-colors ${
                    checked ? "border-[4px] border-brand-glow" : "border-ink-muted/60"
                  }`}
                />
                {t.label}
              </span>
              <span className="whitespace-nowrap tabular-nums">+{t.price} Kč</span>
            </label>
          );
        })}
      </fieldset>
    </ExtraRow>
  );
}

// Нарисованный чекбокс: состояние берётся из настоящего input рядом (он скрыт).
function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
        checked ? "border-brand bg-brand" : "border-ink-muted/60"
      }`}
    >
      {checked && <Check size={14} strokeWidth={3} className="text-ink" />}
    </span>
  );
}

function RouteResultPanel({ result, onOrder }: { result: ServiceCost; onOrder: () => void }) {
  return (
    <div>
      <div aria-live="polite" className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink-muted">Skoro, маршрут</span>
        <span className="font-display text-3xl leading-none tabular-nums text-brand-glow">
          {formatCzk(result.total)}
        </span>
      </div>

      <HowCalculated>
        <BreakdownList title="Skoro, маршрут" total={result.total} items={result.breakdown} />
      </HowCalculated>

      <PriceNote />
      <OrderActions onOrder={onOrder} />
    </div>
  );
}

function IndividualDealDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const callRef = useRef<HTMLAnchorElement>(null);

  // Фокус в диалог, Esc закрывает, по закрытии фокус возвращается туда, откуда открыли.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    callRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [onClose]);

  // Портал: внутри секции диалог позиционировался бы от её контейнера, а не от экрана.
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-bg-deep/80 px-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-hairline-strong bg-bg-soft p-6 shadow-lifted"
      >
        <h4 id={titleId} className="font-display text-2xl leading-tight text-ink">
          Больше трёх доставок — согласуем лично
        </h4>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Маршрут с большим числом доставок удобнее согласовать с менеджером — подберём порядок
          точек и оптимальный темп.
        </p>
        <a
          ref={callRef}
          href={supportPhoneHref}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-medium text-bg transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-glow"
        >
          <Phone aria-hidden size={16} />
          Позвонить {supportPhone}
        </a>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 min-h-12 w-full rounded-xl border border-hairline-strong px-5 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-glow"
        >
          Вернуться к расчёту
        </button>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] text-ink-muted">
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
    <fieldset>
      <legend className="mb-1.5 text-[13px] text-ink-muted">{zone.name}</legend>
      <div className="flex flex-wrap gap-1.5">
        {points.map(p => {
          const selected = selectedIds.includes(p.id);
          return (
            <label
              key={p.id}
              className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors [@media(pointer:coarse)]:min-h-11 ${focusRing} ${
                selected
                  ? "border-brand bg-brand/20 text-ink"
                  : "border-hairline-strong text-ink-muted hover:border-brand/50 hover:text-ink"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle(p.id)}
                className="sr-only"
              />
              {selected && <Check aria-hidden size={14} strokeWidth={3} className="-ml-0.5 text-brand-glow" />}
              {p.name}
              {p.delivery_service && (
                <span className="text-[13px] text-ink-muted">· {p.delivery_service}</span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ResultPanel({ result, onOrder }: { result: CalculatorResult; onOrder: () => void }) {
  const { competitors, skoro, savings, savingsPct } = result;

  // 3 состояния: выгодно / дороже / сопоставимо
  const tone =
    savings > 0 ? "win"
    : savings < 0 ? "lose"
    : "neutral";

  const toneTitle = {
    win: `Экономия ${formatCzk(savings)} · ${savingsPct} %`,
    lose: `Skoro дороже на ${formatCzk(-savings)}`,
    neutral: "Цены сопоставимы",
  }[tone];

  return (
    <div>
      {/* Две колонки: доставка магазинов vs Skoro */}
      <div aria-live="polite" className="grid grid-cols-2 gap-2">
        <CostColumn
          label="Доставка магазинов"
          sub="каждый везёт сам"
          amount={competitors.total}
        />
        <CostColumn
          label="Skoro"
          sub="один курьер, один рейс"
          amount={skoro.total}
          accent
        />
        <p
          className={`col-span-2 mt-1 text-base font-medium ${
            tone === "win" ? "text-brand-glow" : "text-ink-muted"
          }`}
        >
          {toneTitle}
        </p>
      </div>

      <p className="mt-2 text-[13px] leading-snug text-ink-muted">
        Часть конкурентов не доставляет в день заказа — фактическая выдача может прийтись на следующий день.
      </p>

      <HowCalculated>
        <BreakdownList
          title="Доставка магазинов"
          total={competitors.total}
          items={competitors.breakdown}
        />
        <BreakdownList
          title="Skoro, один рейс"
          total={skoro.total}
          items={skoro.breakdown}
        />
      </HowCalculated>

      <PriceNote />
      <OrderActions onOrder={onOrder} />
    </div>
  );
}

function HowCalculated({ children }: { children: ReactNode }) {
  return (
    <details className="group mt-4">
      <summary className="flex min-h-10 w-fit cursor-pointer list-none items-center gap-1.5 rounded-md text-[13px] text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-glow [&::-webkit-details-marker]:hidden">
        <ChevronDown aria-hidden size={16} className="transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        Как посчитали
      </summary>
      <div className="mt-2 grid gap-2">{children}</div>
    </details>
  );
}

// Цена в калькуляторе — превью; бизнес-цену подтверждает менеджер (src/lib/pricing, P-38).
function PriceNote() {
  return (
    <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
      Предварительная оценка. Цена рассчитана
      для заказов, готовых к выдаче; одиночные доставки оплачиваются по{" "}
      <a
        href="#tariffs"
        className="text-ink underline decoration-brand-glow/60 underline-offset-4 transition-colors hover:text-brand-glow"
      >
        базовым тарифам
      </a>
      .
    </p>
  );
}

function OrderActions({ onOrder }: { onOrder: () => void }) {
  return (
    <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <a
        href="#contact"
        onClick={onOrder}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ink px-5 text-sm font-medium text-bg transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-glow"
      >
        Оставить заявку с этим расчётом
      </a>
      <a
        href={supportPhoneHref}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-glow"
      >
        <Phone aria-hidden size={16} />
        {supportPhone}
      </a>
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
    <div
      className={`flex flex-col gap-1.5 rounded-xl border p-3.5 ${
        accent ? "border-brand/50 bg-bg" : "border-hairline-strong bg-bg/50"
      }`}
    >
      <span className="text-[13px] text-ink-muted">{label}</span>
      <span
        className={`font-display text-3xl leading-none tabular-nums ${
          accent ? "text-brand-glow" : "text-ink"
        }`}
      >
        {formatCzk(amount)}
      </span>
      <span className="text-[13px] leading-snug text-ink-muted">{sub}</span>
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
  items: CostBreakdownItem[];
}) {
  return (
    <div className="rounded-xl border border-hairline bg-bg/50 p-3.5">
      <div className="mb-2 text-[13px] font-medium text-ink">{title}</div>
      <ul className="space-y-1.5 text-[13px] text-ink-muted">
        {visibleBreakdown(items).map((it, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span>{it.label}</span>
            <span className="shrink-0 tabular-nums text-ink">{formatCzk(it.amount)}</span>
          </li>
        ))}
        <li className="mt-1.5 flex items-baseline justify-between border-t border-hairline pt-1.5 font-medium text-ink">
          <span>Итого</span>
          <span className="tabular-nums">{formatCzk(total)}</span>
        </li>
      </ul>
    </div>
  );
}

// Заглушка того же размера и с тем же id, что и калькулятор: ссылка «Под задачу» работает и во время загрузки.
function CalculatorSkeleton() {
  return (
    <div
      id="calculator"
      aria-busy="true"
      className="scroll-mt-24 rounded-2xl border border-hairline-strong bg-bg-soft p-5 sm:p-6"
    >
      <span className="sr-only">Загружаем тарифы…</span>
      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        <div className="h-7 w-2/3 rounded bg-bg-raised/60" />
        <div className="mt-4 h-12 rounded-xl bg-bg-raised/40" />
        <div className="mt-3 h-4 w-4/5 rounded bg-bg-raised/30" />
        <div className="mt-8 flex flex-wrap gap-1.5">
          {[28, 36, 24, 32, 40, 26].map(w => (
            <div key={w} className="h-10 rounded-full bg-bg-raised/40" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="mt-8 h-14 rounded-xl bg-bg-raised/40" />
        <div className="mt-8 h-24 rounded-xl bg-bg-raised/30" />
      </div>
    </div>
  );
}

function CalculatorError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      id="calculator"
      role="alert"
      className="scroll-mt-24 rounded-2xl border border-hairline-strong bg-bg-soft p-5 sm:p-6"
    >
      <h3 className="font-display text-2xl leading-tight text-ink">Сколько стоит доставка</h3>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        Не получилось загрузить тарифы. Попробуйте ещё раз или позвоните — посчитаем по телефону.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ink px-5 text-sm font-medium text-bg transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-glow"
        >
          Повторить
        </button>
        <a
          href={supportPhoneHref}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <Phone aria-hidden size={16} />
          {supportPhone}
        </a>
      </div>
    </div>
  );
}
