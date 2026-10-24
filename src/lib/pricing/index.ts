import { businessTariff } from "./business";
import { personalTariff } from "./personal";
import type { DeliveryQuoteRequest, PricingAudience, Quote, TariffStrategy } from "./types";

export type { DeliveryQuoteRequest, PricingAudience, Quote, QuoteLine, TariffStrategy } from "./types";

/** Стратегия на каждую версию сайта; добавить версию — добавить запись сюда. */
export const TARIFFS: Record<PricingAudience, TariffStrategy> = {
  business: businessTariff,
  personal: personalTariff,
};

/**
 * Расчёт доставки по тарифу версии сайта. В форме — превью для клиента;
 * авторитетная цена для заказа и оплаты считается тем же модулем на сервере (ADR-0004 §4).
 */
export function quoteDelivery(audience: PricingAudience, request: DeliveryQuoteRequest): Quote | null {
  return TARIFFS[audience].quote(request);
}
