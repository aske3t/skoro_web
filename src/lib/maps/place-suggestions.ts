"use client";

import { loadGoogleMaps } from "./loader";

// Подсказки адресов через Places API (New). В отличие от виджета google.maps.places.Autocomplete
// (закрыт для новых проектов с марта 2025) не трогает поле ввода: при отказе Google поле
// остаётся обычным, а не блокируется с текстом «Ошибка».
const BRNO_CENTER = { lat: 49.195, lng: 16.608 };
const BIAS_RADIUS_M = 30_000;

export type PlaceSuggestion = {
  id: string;
  text: string; // полный адрес — его подставляем в поле
  main: string;
  secondary: string;
};

export function newSessionToken(google: typeof globalThis.google) {
  return new google.maps.places.AutocompleteSessionToken();
}

export async function fetchPlaceSuggestions(
  input: string,
  sessionToken?: google.maps.places.AutocompleteSessionToken,
): Promise<PlaceSuggestion[]> {
  const google = await loadGoogleMaps();
  const { suggestions } =
    await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken,
      includedRegionCodes: ["cz"],
      // Адреса по-чешски: так их проще найти курьеру в навигаторе.
      language: "cs",
      locationBias: { center: BRNO_CENTER, radius: BIAS_RADIUS_M },
    });

  return suggestions.flatMap((s) => {
    const p = s.placePrediction;
    if (!p) return [];
    const text = p.text.toString();
    return [
      {
        id: p.placeId,
        text,
        main: p.mainText?.toString() ?? text,
        secondary: p.secondaryText?.toString() ?? "",
      },
    ];
  });
}
