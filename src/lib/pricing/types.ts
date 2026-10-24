// Модуль цен (ADR-0004): чистые функции без I/O, одинаково работают в браузере и на сервере.
// Тарифы раздельные для версий сайта — бизнес и частные лица (P-32, P-35).

/** Совпадает с версиями сайта из `src/lib/audience.ts`. */
export type PricingAudience = "business" | "personal";

export type QuoteLine = { label: string; amount: number };

/** Расчёт стоимости: итог, разбивка и версия тарифа — для снимка цены в заказе (ADR-0004 §5). */
export type Quote = {
  total: number;
  currency: "CZK";
  breakdown: QuoteLine[];
  pricingVersion: string;
};

/** Что известно о доставке из формы. Поля добавятся вместе с тарифной логикой (слот, вес, доплаты). */
export type DeliveryQuoteRequest = {
  pickupAddress: string;
  deliveryAddress: string;
  paymentMethod: string | null;
};

/** Тарифная стратегия одной версии сайта. `null` — цену не считаем, менеджер называет её после заявки. */
export type TariffStrategy = {
  audience: PricingAudience;
  quote: (request: DeliveryQuoteRequest) => Quote | null;
};
