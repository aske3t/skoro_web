import type { TariffStrategy } from "./types";

/** Тарифы для частных лиц. Пока расчёта нет: цену называет менеджер после заявки. */
export const personalTariff: TariffStrategy = {
  audience: "personal",
  quote: () => null,
};
