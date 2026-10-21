"use client";

import { useEffect, useRef, type RefObject } from "react";
import { loadGoogleMaps } from "./loader";

export type AddressLocation = { lat: number; lng: number };

type Options = {
  inputRef: RefObject<HTMLInputElement | null>;
  onSelect: (address: string, location: AddressLocation) => void;
  bounds?: google.maps.LatLngBoundsLiteral;
  country?: string;       // "cz", "de", ...
  strictBounds?: boolean;
};

const BRNO_BOUNDS = { north: 49.30, south: 49.10, east: 16.75, west: 16.45 };

export function useAddressAutocomplete({
  inputRef,
  onSelect,
  bounds = BRNO_BOUNDS,
  country = "cz",
  strictBounds = true,
}: Options) {
  // Колбэк приходит новым на каждом рендере (inline-стрелка у вызывающего).
  // Держим его в ref, чтобы эффект не пересоздавал Autocomplete и .pac-container.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    let listener: google.maps.MapsEventListener | null = null;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !inputRef.current) return;

        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          bounds,
          strictBounds,
          componentRestrictions: { country },
          types: ["address"],
          fields: ["formatted_address", "geometry.location"],
        });

        listener = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const loc = place.geometry?.location;
          if (place.formatted_address && loc) {
            onSelectRef.current(place.formatted_address, { lat: loc.lat(), lng: loc.lng() });
          }
        });
      })
      // Без ключа или при сбое загрузки поле остаётся обычным вводом без подсказок.
      .catch((error: unknown) => {
        console.warn(
          "[maps] address autocomplete unavailable:",
          error instanceof Error ? error.message : error,
        );
      });

    return () => { cancelled = true; listener?.remove(); };
  }, [inputRef, bounds, country, strictBounds]);
}