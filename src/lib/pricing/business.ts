import type { TariffStrategy } from "./types";

/** Тарифы для бизнеса. Пока расчёта нет: цену называет менеджер после заявки. */
export const businessTariff: TariffStrategy = {
  audience: "business",
  quote: () => null,
};
