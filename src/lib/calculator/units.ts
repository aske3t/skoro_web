import { RouteUnit } from "./types";

//хелпер для копии
export function resolveRecipient(
  units: RouteUnit[], index: number,
): RouteUnit["recipient"] {
  const u = units[index];
  if (u.recipientSameAs !== null && units[u.recipientSameAs]) {
    return units[u.recipientSameAs].recipient;
  }
  return u.recipient;
}