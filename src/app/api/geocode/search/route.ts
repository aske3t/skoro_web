import { NextResponse, type NextRequest } from "next/server";

type NominatimAddress = Record<string, string | undefined>;

type NominatimPlace = {
  place_id: number | string;
  osm_id?: number | string;
  osm_type?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  category?: string;
  type?: string;
  address?: NominatimAddress;
};

type AddressSuggestion = {
  id: string;
  label: string;
  meta: string;
  lat: number;
  lon: number;
};

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 1100;

const cache = new Map<
  string,
  { expiresAt: number; suggestions: AddressSuggestion[] }
>();

let lastNominatimRequestAt = 0;

function getCacheKey(query: string) {
  return query.trim().toLowerCase();
}

function getCity(address?: NominatimAddress) {
  return (
    address?.city ??
    address?.town ??
    address?.village ??
    address?.municipality ??
    address?.county
  );
}

function getMeta(place: NominatimPlace) {
  const address = place.address;
  const street = [address?.road, address?.house_number]
    .filter(Boolean)
    .join(" ");
  const city = getCity(address);

  return [
    street,
    city,
    address?.postcode,
    address?.country_code?.toUpperCase(),
  ]
    .filter(Boolean)
    .join(" · ");
}

function normalizePlace(place: NominatimPlace): AddressSuggestion | null {
  const label = place.display_name?.trim();
  const lat = Number(place.lat);
  const lon = Number(place.lon);

  if (!label || Number.isNaN(lat) || Number.isNaN(lon)) {
    return null;
  }

  return {
    id:
      place.osm_type && place.osm_id
        ? `${place.osm_type}-${place.osm_id}`
        : String(place.place_id),
    label,
    meta: getMeta(place),
    lat,
    lon,
  };
}

async function waitForNominatimSlot() {
  const elapsed = Date.now() - lastNominatimRequestAt;
  const delay = MIN_REQUEST_INTERVAL_MS - elapsed;

  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  lastNominatimRequestAt = Date.now();
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const cacheKey = getCacheKey(query);
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(
      { suggestions: cached.suggestions },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  }

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    countrycodes: "cz",
    layer: "address,poi",
    "accept-language": "cs,ru,en",
  });

  await waitForNominatimSlot();

  const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
    headers: {
      "User-Agent":
        process.env.NOMINATIM_USER_AGENT ??
        "SkoroWeb/0.1 address-search (local-development)",
      Referer: request.nextUrl.origin,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Nominatim search failed", suggestions: [] },
      { status: response.status },
    );
  }

  const places = (await response.json()) as NominatimPlace[];
  const suggestions = places
    .map(normalizePlace)
    .filter((place): place is AddressSuggestion => Boolean(place));

  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    suggestions,
  });

  return NextResponse.json(
    { suggestions },
    { headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
