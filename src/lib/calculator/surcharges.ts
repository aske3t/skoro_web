import type { BuyoutTierId, DocWorkTier, StopSurcharge } from "./types"

export const WEIGHT_SURCHARGE = 50;

export const BUYOUT_TIERS: { id: BuyoutTierId; label: string; price: number }[] = [
  { id: "none",   label: "Не требуется",        price: 0   },
  { id: "small",  label: "До 1 позиции",         price: 50  },
  { id: "medium", label: "До 5 позиций",         price: 75  },
  { id: "large",  label: "Свыше 5 позиций",      price: 100 },
];

export const DOC_TIERS: { id: DocWorkTier; label: string; price: number }[] = [
  { id: "none",    label: "Не требуется",                   price: 0   },
  { id: "simple",  label: "Подпись / штамп",                price: 50  },
  { id: "average", label: "Заполнение бумаг на месте",      price: 100 },
  { id: "complex", label: "Заверение нескольких документов",price: 150 },
];

export function calcStopSurcharge(s: StopSurcharge) {
  const items: { label: string; amount: number }[] = [];
  let total = 0;

  if (s.weight15) {
    items.push({ label: "Вес >15 кг", amount: WEIGHT_SURCHARGE });
    total += WEIGHT_SURCHARGE;
  }

  const buyout = BUYOUT_TIERS.find(t => t.id === s.buyoutTier);
  if (buyout && buyout.price > 0) {
    items.push({ label: `Выкуп · ${buyout.label}`, amount: buyout.price });
    total += buyout.price;
  }

  const doc = DOC_TIERS.find(t => t.id === s.docTier);
  if (doc && doc.price > 0) {
    items.push({ label: `Доверенность · ${doc.label}`, amount: doc.price });
    total += doc.price;
  }

  return { total, items };
}