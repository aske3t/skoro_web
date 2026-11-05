import { z } from "zod";
import type { TariffKind } from "./types.ts";

const schema = z.strictObject({ price: z.number().nonnegative() });

export type FlatParams = z.output<typeof schema>;

/** Одна цена на опцию (ADR-0006 §2). */
export const flat: TariffKind<FlatParams> = {
  schema,
  quote(params, _request, context) {
    return {
      total: params.price,
      currency: "CZK",
      breakdown: [{ label: context.optionName, amount: params.price }],
      pricingVersion: "flat/1",
    };
  },
};
