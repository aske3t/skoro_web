import type { AddressLocation } from "./adressAutocomplete";
import type { Zone } from "@/lib/calculator/types";
import { ZONE_CENTERS } from "./zoneCenters";

function haversine(a: AddressLocation, b: AddressLocation): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function findClosestZone(
  loc: AddressLocation, zones: Zone[],
): string | null {
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const z of zones) {
    const c = ZONE_CENTERS[z.slug];
    if (!c) continue;
    const d = haversine(loc, c);
    if (d < bestDist) { bestDist = d; bestId = z.id; }
  }
  return bestId;
}