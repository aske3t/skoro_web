"use client";

import { useActionState, useEffect, useRef } from "react";
import { subscribeNewsletter } from "@/lib/newsletter/actions";
import type { NewsletterErrorCode, NewsletterState } from "@/lib/newsletter/schema";

// TODO(владелец): текст согласия на рассылку и ссылка на политику конфиденциальности.
// Юридические тексты пишет только владелец (CLAUDE.md). До этого — плейсхолдер (P-40).
const CONSENT_TEXT = "[Текст согласия на рассылку — заполнит владелец]";
const PRIVACY_HREF = "";

const ERROR_TEXT: Record<NewsletterErrorCode, string> = {
  invalid_email: "Проверьте адрес почты.",
  consent_required: "Отметьте согласие на рассылку.",
  rate_limited: "Слишком много попыток. Попробуйте через несколько минут.",
  server_error: "Не получилось подписаться. Попробуйте ещё раз чуть позже.",
};

const INITIAL: NewsletterState = { status: "idle" };

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(subscribeNewsletter, INITIAL);
  // Time-trap, как у формы заявки: длительность заполнения по часам клиента.
  const mountedAt = useRef<number | null>(null);
  const elapsedRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const intro = (
    <div>
      <h2 className="font-display text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] tracking-[-0.02em] text-ink">
        Подпишитесь на нашу рассылку
      </h2>
      <p className="mt-3 text-base text-ink-muted">Новости сервиса и акции.</p>
    </div>
  );

  if (state.status === "success") {
    return (
      <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-2">
        {intro}
        <div role="status">
          <p className="font-display text-2xl leading-tight text-ink">Готово, вы подписаны</p>
          <p className="mt-2 text-sm text-ink-muted">Новости Skoro придут на указанную почту.</p>
        </div>
      </div>
    );
  }

  const error = state.status === "error" ? state.code : null;
  const emailError = error === "invalid_email";

  return (
    <form
      action={formAction}
      onSubmit={() => {
        if (mountedAt.current !== null && elapsedRef.current) {
          elapsedRef.current.value = String(Date.now() - mountedAt.current);
        }
      }}
      className="grid grid-cols-1 items-end gap-8 lg:grid-cols-2"
      noValidate
    >
      {intro}

      <div className="relative w-full max-w-xl">
        <input type="hidden" name="elapsedMs" ref={elapsedRef} defaultValue="" />
        {/* Honeypot: скрыт от людей, но не через display:none — его боты пропускают. */}
        <div aria-hidden className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
          <label htmlFor="newsletter-website">Website</label>
          <input id="newsletter-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <label htmlFor="newsletter-email" className="block text-[13px] text-ink-muted">
          Почта
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="newsletter-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@company.cz"
            defaultValue={state.status === "error" ? state.email : undefined}
            aria-invalid={emailError || undefined}
            aria-describedby={error ? "newsletter-error" : undefined}
            className="min-w-0 flex-1 rounded-xl border border-hairline-strong bg-bg px-4 py-3 text-base text-ink placeholder:text-ink-dim transition-colors focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 aria-[invalid=true]:border-[#FF8A80]"
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-xl bg-ink px-5 text-sm font-medium text-bg transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-glow disabled:opacity-60"
          >
            {pending ? "Отправляем…" : "Подписаться"}
          </button>
        </div>

        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-ink-muted">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
          />
          <span>
            {CONSENT_TEXT}
            {PRIVACY_HREF && (
              <>
                {" "}
                <a
                  href={PRIVACY_HREF}
                  className="text-ink underline decoration-brand-glow/60 underline-offset-4 hover:text-brand-glow"
                >
                  Политика конфиденциальности
                </a>
              </>
            )}
          </span>
        </label>

        {error && (
          <p id="newsletter-error" role="alert" className="mt-3 text-[13px] text-[#FF8A80]">
            {ERROR_TEXT[error]}
          </p>
        )}
      </div>
    </form>
  );
}
