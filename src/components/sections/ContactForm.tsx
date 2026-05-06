"use client";

import { ArrowUpRight, Phone } from "lucide-react";
import { useState, type ReactNode } from "react";

const inputClass =
  "w-full rounded-xl border border-hairline-strong bg-bg/40 px-4 py-3.5 font-mono text-sm text-ink placeholder:text-ink-dim transition focus:border-brand/60 focus:outline-none";

export default function ContactForm() {
  const [formType, setFormType] = useState<"delivery" | "question">("delivery");
  const isDelivery = formType === "delivery";
  const messagePlaceholder = isDelivery
    ? "Опишите, что нужно доставить, откуда и куда. Если знаете дату или время, укажите их здесь."
    : "Опишите ваш вопрос — мы ответим в течение рабочего дня.";
  const formTypeHint = isDelivery
    ? "Заявка будет отмечена как запрос на доставку."
    : "Заявка будет отмечена как общий вопрос.";

  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-bg pb-32 pt-32"
    >
      {/* Background layers */}
      <div aria-hidden className="absolute inset-0 grid-lines opacity-30" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(146,90,244,0.16), transparent 60%), radial-gradient(ellipse 55% 60% at 100% 100%, rgba(179,143,185,0.10), transparent 65%)",
        }}
      />
      <div className="noise-layer" />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Section header */}
        <div>
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-label text-ink-muted">
            <span className="inline-block h-px w-8 bg-ink-muted" />
            Связаться с нами · заявка или вопрос
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-16">
            <h2 className="max-w-3xl font-display text-[clamp(2.25rem,6vw,4.75rem)] font-normal leading-[1] tracking-[-0.02em] text-ink">
              Мы свяжемся{" "}
              <span className="italic text-brand-glow">с вами!</span>
            </h2>

            <div className="max-w-md lg:ml-auto lg:pt-1">
              <p className="text-base leading-relaxed text-ink-muted md:text-lg">
                Заполните форму — ответим в течение рабочего дня. Поля,
                отмеченные звёздочкой, обязательны.
              </p>

              <a
                href="tel:+420795402571"
                className="mt-5 inline-flex max-w-full items-center gap-3 rounded-full border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-ink transition hover:border-brand hover:bg-brand hover:text-ink md:px-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/25 text-brand-glow">
                  <Phone size={16} />
                </span>
                <span className="min-w-0 leading-snug">
                  <span className="block text-xs text-ink-muted">
                    Либо позвоните нам
                  </span>
                  <span className="block font-mono text-sm text-ink">
                    +420 795 402 571
                  </span>
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Form card */}
        <form
          className="relative mt-16 overflow-hidden rounded-[1.75rem] border border-hairline-strong bg-bg-soft/60 p-8 shadow-card backdrop-blur-sm md:p-12"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="noise-layer rounded-[1.75rem]" />
          <input type="hidden" name="requestType" value={formType} />

          {/* Card header — placeholder heading */}
          <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-label text-ink-dim">
                Form
              </div>
              <h3 className="mt-3 font-display text-3xl leading-tight tracking-[-0.01em] text-ink md:text-4xl">
                Контактная форма
              </h3>

              <div className="mt-5 grid w-full max-w-xl grid-cols-1 rounded-[1.25rem] border border-hairline-strong bg-bg/40 p-1 sm:grid-cols-2 sm:rounded-full">
                <button
                  type="button"
                  aria-pressed={isDelivery}
                  onClick={() => setFormType("delivery")}
                  className={`rounded-full px-4 py-3 font-mono text-[10px] uppercase tracking-label transition ${
                    isDelivery
                      ? "bg-brand text-ink shadow-brand"
                      : "text-ink-dim hover:bg-ink/5 hover:text-ink"
                  }`}
                >
                  Мне нужна доставка
                </button>

                <button
                  type="button"
                  aria-pressed={!isDelivery}
                  onClick={() => setFormType("question")}
                  className={`rounded-full px-4 py-3 font-mono text-[10px] uppercase tracking-label transition ${
                    !isDelivery
                      ? "bg-brand text-ink shadow-brand"
                      : "text-ink-dim hover:bg-ink/5 hover:text-ink"
                  }`}
                >
                  Хочу задать вопрос
                </button>
              </div>

              <p className="mt-3 max-w-xl text-xs leading-relaxed text-ink-dim">
                {formTypeHint}
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-label text-ink-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-glow" />
              Ответим за 24 часа
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-8 h-px w-full bg-hairline-strong" />

          {/* Fields */}
          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field label="Имя" htmlFor="firstName">
              <input
                id="firstName"
                type="text"
                placeholder="Иван"
                className={inputClass}
              />
            </Field>
            <Field label="Фамилия" htmlFor="lastName">
              <input
                id="lastName"
                type="text"
                placeholder="Иванов"
                className={inputClass}
              />
            </Field>

            <Field label="Email" htmlFor="email" required>
              <input
                id="email"
                type="email"
                placeholder="example@domain.com"
                className={inputClass}
              />
            </Field>
            <Field label="Телефон" htmlFor="phone">
              <div className="flex items-stretch overflow-hidden rounded-xl border border-hairline-strong bg-bg/40 transition focus-within:border-brand/60">
                <span className="flex items-center gap-2 border-r border-hairline-strong px-4 font-mono text-sm text-ink-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-glow" />
                  +420
                </span>
                <input
                  id="phone"
                  type="tel"
                  placeholder="000 000 00 00"
                  className="flex-1 bg-transparent px-4 py-3.5 font-mono text-sm text-ink placeholder:text-ink-dim focus:outline-none"
                />
              </div>
            </Field>

            <div className="md:col-span-2">
              <Field label="Сообщение" htmlFor="message" required>
                <textarea
                  id="message"
                  rows={5}
                  placeholder={messagePlaceholder}
                  className={`${inputClass} min-h-[140px] resize-y`}
                />
              </Field>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-8 h-px w-full bg-hairline-strong" />

          {/* Footer row */}
          <div className="relative flex flex-col-reverse items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-xs leading-relaxed text-ink-dim">
              Отправляя форму, вы соглашаетесь с обработкой персональных
              данных в соответствии с политикой конфиденциальности.
            </p>
            <button
              type="submit"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 font-mono text-[11px] uppercase tracking-label text-bg transition hover:bg-brand hover:text-ink"
            >
              Отправить
              <ArrowUpRight
                size={14}
                className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-3 block font-mono text-[11px] uppercase tracking-label text-ink-muted"
      >
        {label}
        {required && <span className="ml-1 text-brand-glow">*</span>}
      </label>
      {children}
    </div>
  );
}
