"use client";

import type { LeadKind } from "./schema";

// Контекст для формы заявки из других секций лендинга (сейчас — «Почему мы нужны?»).
// Событие окна, как в audience.ts: секции не знают о форме, форма слушает.
// На сервер уходит только то, что окажется в полях формы, контракт заявки не меняется.
const PREFILL_EVENT = "skoro:lead-prefill";

export type LeadPrefill = {
  kind: LeadKind;
  /** Текст для поля сообщения; пустая строка — только переключить тип заявки. */
  message: string;
};

export function requestLeadPrefill(prefill: LeadPrefill) {
  window.dispatchEvent(new CustomEvent<LeadPrefill>(PREFILL_EVENT, { detail: prefill }));
}

export function onLeadPrefill(handler: (prefill: LeadPrefill) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<LeadPrefill>).detail);
  window.addEventListener(PREFILL_EVENT, listener);
  return () => window.removeEventListener(PREFILL_EVENT, listener);
}
