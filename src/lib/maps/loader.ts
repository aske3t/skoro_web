"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let loaderPromise: Promise<typeof google> | null = null;
let optionsSet = false;

export function loadGoogleMaps(): Promise<typeof google> {
  if (loaderPromise) return loaderPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY не задан в .env.local"),
    );
  }

  if (!optionsSet) {
    setOptions({
      key: apiKey,
      v: "weekly",
      language: "ru",
      region: "CZ",
    });

    optionsSet = true;
  }

  loaderPromise = importLibrary("places").then(() => google);

  return loaderPromise;
}
