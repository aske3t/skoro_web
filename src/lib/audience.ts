"use client";

import { useSyncExternalStore } from "react";

// Версия сайта: для бизнеса или для частных лиц (решение владельца 2026-10-21, P-31).
// Хранится в браузере; шапка и форма заявки читают одно и то же значение.
export const AUDIENCES = ["business", "personal"] as const;
export type Audience = (typeof AUDIENCES)[number];

const STORAGE_KEY = "skoro:audience";
const CHANGE_EVENT = "skoro:audience-change";
const DEFAULT_AUDIENCE: Audience = "business";

function read(): Audience {
  try {
    return localStorage.getItem(STORAGE_KEY) === "personal" ? "personal" : DEFAULT_AUDIENCE;
  } catch {
    return DEFAULT_AUDIENCE;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange); // другие вкладки
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setAudience(audience: Audience) {
  try {
    localStorage.setItem(STORAGE_KEY, audience);
  } catch {
    // Приватный режим без localStorage: выбор живёт до перезагрузки страницы.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** На сервере и при гидратации — «бизнес», затем значение из браузера. Без расхождения HTML. */
export function useAudience(): Audience {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_AUDIENCE);
}
