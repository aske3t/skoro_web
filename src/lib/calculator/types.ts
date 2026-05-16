import type { Database } from "@/types/database";
import type { AddressLocation } from "../maps/adressAutocomplete";

// ── Сырые типы, генерящиеся из Supabase ────────────────────────────
export type Zone         = Database["public"]["Tables"]["zones"]["Row"];
export type RetailPoint  = Database["public"]["Tables"]["retail_points"]["Row"];
export type ZoneDistance = Database["public"]["Tables"]["zone_distances"]["Row"];
export type SkoroPricing = Database["public"]["Tables"]["skoro_pricing"]["Row"];
export type DeliverySlot = Database["public"]["Tables"]["delivery_slots"]["Row"]

// ── Что калькулятор держит в state после загрузки ──────────────────
export type CalculatorData = {
  zones: Zone[];
  retailPoints: RetailPoint[];
  distances: ZoneDistance[];
  skoro: SkoroPricing;
  slots: DeliverySlot[];
};

// ── Вход в формулу ─────────────────────────────────────────────────
export type PricingInput = {
  pickupPointIds: string[];   // выбранные торговые точки
  deliveryZoneId: string;     // зона доставки клиента
  slotId: string;
  deliveryLocation?: { lat: number; lng: number } | null
};

// ── Структура для отображения результата ───────────────────────────
export type CostBreakdownItem = { label: string; amount: number };

export type ServiceCost = {
  total: number;
  breakdown: CostBreakdownItem[];
  serviceSlug: string
  serviceName: string
};

export type CalculatorResult = {
  competitors: ServiceCost;   // сумма «каждый магазин шлёт свою доставку»
  skoro: ServiceCost;         // один маршрут Skoro
  savings: number;            // competitors.total − skoro.total
  savingsPct: number;         // округлённый %, отрицательный если Skoro дороже
};

//импорт зависимых типов из calc.tsx
//тиры сложности в диапазаонах, построение системы доплат
export type BuyoutTierId = "none" | "small" | "medium" | "large";
export type DocWorkTier = "none" | "simple" | "average" | "complex";

//детали surcharge остановки
export type StopSurcharge = {
  weight15: boolean;
  buyoutTier: BuyoutTierId;
  docTier: DocWorkTier;
}
//детали точки остановки
export type RouteStop = {
  address: string;
  location: AddressLocation | null;
  zoneId: string | null;
  slotId: string;
  surcharge: StopSurcharge;
};
//получатель
export type RouteRecipient = {
  address: string;
  location: AddressLocation | null;
}
//юнит маршрута, вместо отдельных сущностей
export type RouteUnit = {
  pickup: {
    address: string;
    location: AddressLocation | null;
    zoneId: string | null;
    slotId: string;
    surcharge: StopSurcharge;
  };
  recipient: {
    address: string;
    location: AddressLocation | null;
  };
  // null = собственный адрес; число = индекс юнита, у которого заимствуем recipient
  recipientSameAs: number | null;
}
