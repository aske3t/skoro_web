import type { Database } from "@/types/database";

// ── Сырые типы, генерящиеся из Supabase ────────────────────────────
export type Zone         = Database["public"]["Tables"]["zones"]["Row"];
export type RetailPoint  = Database["public"]["Tables"]["retail_points"]["Row"];
export type ZoneDistance = Database["public"]["Tables"]["zone_distances"]["Row"];
export type SkoroPricing = Database["public"]["Tables"]["skoro_pricing"]["Row"];

// ── Что калькулятор держит в state после загрузки ──────────────────
export type CalculatorData = {
  zones: Zone[];
  retailPoints: RetailPoint[];
  distances: ZoneDistance[];
  skoro: SkoroPricing;
};

// ── Вход в формулу ─────────────────────────────────────────────────
export type PricingInput = {
  pickupPointIds: string[];   // выбранные торговые точки
  deliveryZoneId: string;     // зона доставки клиента
};

// ── Структура для отображения результата ───────────────────────────
export type CostBreakdownItem = { label: string; amount: number };

export type ServiceCost = {
  total: number;
  breakdown: CostBreakdownItem[];
};

export type CalculatorResult = {
  competitors: ServiceCost;   // сумма «каждый магазин шлёт свою доставку»
  skoro: ServiceCost;         // один маршрут Skoro
  savings: number;            // competitors.total − skoro.total
  savingsPct: number;         // округлённый %, отрицательный если Skoro дороже
};
