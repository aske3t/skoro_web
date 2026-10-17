"use client";

import { ArrowUpRight, Phone } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { submitLead } from "@/lib/leads/actions";
import {
  ADDRESS_MAX,
  EMAIL_MAX,
  MESSAGE_MAX,
  NAME_MAX,
  PAYMENT_METHODS,
  PHONE_INPUT_MAX,
  PHOTO_ACCEPT,
  PHOTO_MAX_BYTES,
  UTM_KEYS,
} from "@/lib/leads/constants";
import type {
  FieldErrorCode,
  LeadField,
  LeadFormState,
  LeadKind,
} from "@/lib/leads/schema";

const inputClass =
  "w-full rounded-xl border border-hairline-strong bg-bg/40 px-4 py-3.5 font-mono text-sm text-ink placeholder:text-ink-dim transition focus:border-brand/60 focus:outline-none aria-[invalid=true]:border-red-400/70";

const SUPPORT_PHONE = "+420 795 402 571";
const SUPPORT_PHONE_HREF = "tel:+420795402571";

const INITIAL_STATE: LeadFormState = { status: "idle" };

const FIELD_ERROR_TEXT: Record<FieldErrorCode, string> = {
  required: "Заполните это поле.",
  invalid: "Проверьте значение.",
  too_long: "Слишком длинное значение.",
  too_large: "Файл слишком большой: не более 4 МБ.",
};

const PAYMENT_LABEL: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Наличные",
  online: "Оплата на сайте",
};

const INVALID_FIELD_TEXT: Partial<Record<LeadField, string>> = {
  email: "Введите корректный email.",
  phone: "Введите корректный номер телефона.",
  recipientPhone: "Введите корректный номер телефона.",
  paymentMethod: "Выберите способ оплаты.",
  photo: "Подходят только фото JPG, PNG или WebP.",
};

const FORM_ERROR_TEXT = {
  validation: "Проверьте поля формы.",
  rate_limited: "Слишком много заявок за короткое время. Попробуйте позже или позвоните нам:",
  server_error: "Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам:",
} as const;

function fieldErrorText(field: LeadField, code: FieldErrorCode): string {
  return (code === "invalid" && INVALID_FIELD_TEXT[field]) || FIELD_ERROR_TEXT[code];
}

/** utm_* из адресной строки в JSON; пустая строка, если меток нет. */
function readUtmFromLocation(): string {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return Object.keys(utm).length > 0 ? JSON.stringify(utm) : "";
}

export default function ContactForm() {
  // Смена key заново монтирует форму и сбрасывает состояние action.
  const [formKey, setFormKey] = useState(0);

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

        <LeadForm key={formKey} onReset={() => setFormKey((k) => k + 1)} />
      </div>
    </section>
  );
}

function LeadForm({ onReset }: { onReset: () => void }) {
  const [state, formAction, pending] = useActionState(submitLead, INITIAL_STATE);
  // После action React сбрасывает неуправляемые поля к defaultValue,
  // поэтому при ошибке defaultValue берём из вернувшихся values.
  const values = state.status === "error" ? state.values : undefined;
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;
  const formError =
    state.status === "error" && state.code !== "validation" ? state.code : null;

  const [formType, setFormType] = useState<LeadKind>(values?.kind ?? "delivery");
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.status === "error") setFormType(state.values.kind);
  }

  // Time-trap: длительность заполнения по часам клиента, пишется в момент отправки.
  // React 19 вызывает onSubmit до того, как соберёт FormData для action.
  const mountedAtRef = useRef<number | null>(null);
  const elapsedRef = useRef<HTMLInputElement>(null);
  const [utm, setUtm] = useState("");
  useEffect(() => {
    mountedAtRef.current = Date.now();
    setUtm(readUtmFromLocation());
  }, []);

  function recordElapsed() {
    if (mountedAtRef.current !== null && elapsedRef.current) {
      elapsedRef.current.value = String(Date.now() - mountedAtRef.current);
    }
  }

  const [photoTooLarge, setPhotoTooLarge] = useState(false);
  function checkPhotoSize(input: HTMLInputElement) {
    const file = input.files?.[0];
    const tooLarge = Boolean(file && file.size > PHOTO_MAX_BYTES);
    if (tooLarge) input.value = "";
    setPhotoTooLarge(tooLarge);
  }

  const isDelivery = formType === "delivery";
  const messagePlaceholder = isDelivery
    ? "Опишите, что нужно доставить (вес, габариты). Если знаете дату или время забора, укажите их здесь."
    : "Опишите ваш вопрос — мы ответим в течение рабочего дня.";
  const formTypeHint = isDelivery
    ? "Заявка будет отмечена как запрос на доставку."
    : "Заявка будет отмечена как общий вопрос.";

  function errorProps(field: LeadField) {
    const code = fieldErrors?.[field];
    return code
      ? { "aria-invalid": true, "aria-describedby": `${field}-error` }
      : {};
  }

  function errorOf(field: LeadField) {
    const code = fieldErrors?.[field];
    return code ? { id: `${field}-error`, text: fieldErrorText(field, code) } : undefined;
  }

  return (
    <form
      action={formAction}
      onSubmit={recordElapsed}
      className="relative mt-16 overflow-hidden rounded-[1.75rem] border border-hairline-strong bg-bg-soft/60 p-8 shadow-card backdrop-blur-sm md:p-12"
    >
      <div className="noise-layer rounded-[1.75rem]" />
      <input type="hidden" name="kind" value={formType} />
      <input type="hidden" name="elapsedMs" ref={elapsedRef} defaultValue="" />
      <input type="hidden" name="utm" value={utm} />

      {/* Honeypot: скрыт от людей, но не через display:none — его боты пропускают. */}
      <div aria-hidden className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

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

      {state.status === "success" ? (
        <div
          role="status"
          className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="max-w-xl text-base leading-relaxed text-ink md:text-lg">
            Заявка отправлена, ответим в течение рабочего дня.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center rounded-full border border-hairline-strong px-6 py-3.5 font-mono text-[11px] uppercase tracking-label text-ink-muted transition hover:border-ink/40 hover:text-ink"
          >
            Отправить ещё одну
          </button>
        </div>
      ) : (
        <>
          {/* Fields */}
          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field label="Имя" htmlFor="firstName" error={errorOf("firstName")}>
              <input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="Иван"
                autoComplete="given-name"
                maxLength={NAME_MAX}
                defaultValue={values?.firstName}
                className={inputClass}
                {...errorProps("firstName")}
              />
            </Field>
            <Field label="Фамилия" htmlFor="lastName" error={errorOf("lastName")}>
              <input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Иванов"
                autoComplete="family-name"
                maxLength={NAME_MAX}
                defaultValue={values?.lastName}
                className={inputClass}
                {...errorProps("lastName")}
              />
            </Field>

            <Field label="Email" htmlFor="email" required error={errorOf("email")}>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="example@domain.com"
                required
                autoComplete="email"
                maxLength={EMAIL_MAX}
                defaultValue={values?.email}
                className={inputClass}
                {...errorProps("email")}
              />
            </Field>
            <Field label="Телефон" htmlFor="phone" required={isDelivery} error={errorOf("phone")}>
              <PhoneInput
                id="phone"
                name="phone"
                autoComplete="tel"
                required={isDelivery}
                defaultValue={values?.phone}
                invalidProps={errorProps("phone")}
              />
            </Field>

            {isDelivery && (
              <>
                <div className="md:col-span-2">
                  <Field label="Адрес забора" htmlFor="pickupAddress" required error={errorOf("pickupAddress")}>
                    <input
                      id="pickupAddress"
                      name="pickupAddress"
                      type="text"
                      placeholder="Улица, дом, город"
                      required
                      autoComplete="street-address"
                      maxLength={ADDRESS_MAX}
                      defaultValue={values?.pickupAddress}
                      className={inputClass}
                      {...errorProps("pickupAddress")}
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Адрес доставки" htmlFor="deliveryAddress" required error={errorOf("deliveryAddress")}>
                    <input
                      id="deliveryAddress"
                      name="deliveryAddress"
                      type="text"
                      placeholder="Улица, дом, город"
                      required
                      maxLength={ADDRESS_MAX}
                      defaultValue={values?.deliveryAddress}
                      className={inputClass}
                      {...errorProps("deliveryAddress")}
                    />
                  </Field>
                </div>

                <Field label="Телефон получателя" htmlFor="recipientPhone" error={errorOf("recipientPhone")}>
                  <PhoneInput
                    id="recipientPhone"
                    name="recipientPhone"
                    defaultValue={values?.recipientPhone}
                    invalidProps={errorProps("recipientPhone")}
                  />
                </Field>

                <fieldset aria-describedby={fieldErrors?.paymentMethod ? "paymentMethod-error" : undefined}>
                  <legend className="mb-3 block font-mono text-[11px] uppercase tracking-label text-ink-muted">
                    Способ оплаты
                    <span className="ml-1 text-brand-glow">*</span>
                  </legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {PAYMENT_METHODS.map((method) => (
                      <label key={method} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method}
                          required
                          defaultChecked={values?.paymentMethod === method}
                          className="peer sr-only"
                        />
                        <span className="block rounded-xl border border-hairline-strong bg-bg/40 px-4 py-3.5 text-center font-mono text-sm text-ink-muted transition peer-checked:border-brand/60 peer-checked:bg-brand/15 peer-checked:text-ink peer-focus-visible:border-brand/60">
                          {PAYMENT_LABEL[method]}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errorOf("paymentMethod") && (
                    <p id="paymentMethod-error" className="mt-2 text-sm text-red-400">
                      {errorOf("paymentMethod")?.text}
                    </p>
                  )}
                </fieldset>
              </>
            )}

            <div className="md:col-span-2">
              <Field label="Сообщение" htmlFor="message" required error={errorOf("message")}>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  placeholder={messagePlaceholder}
                  required
                  maxLength={MESSAGE_MAX}
                  defaultValue={values?.message}
                  className={`${inputClass} min-h-[140px] resize-y`}
                  {...errorProps("message")}
                />
              </Field>
            </div>

            {isDelivery && (
              <div className="md:col-span-2">
                <Field
                  label="Фото отправления"
                  htmlFor="photo"
                  hint="Необязательно. JPG, PNG или WebP, до 4 МБ."
                  error={
                    photoTooLarge
                      ? { id: "photo-error", text: FIELD_ERROR_TEXT.too_large }
                      : errorOf("photo")
                  }
                >
                  <input
                    id="photo"
                    name="photo"
                    type="file"
                    accept={PHOTO_ACCEPT}
                    onChange={(e) => checkPhotoSize(e.currentTarget)}
                    className={`${inputClass} file:mr-4 file:rounded-full file:border-0 file:bg-brand/25 file:px-4 file:py-2 file:font-mono file:text-xs file:text-ink`}
                    {...errorProps("photo")}
                  />
                </Field>
              </div>
            )}
          </div>

          {formError && (
            <div
              role="alert"
              className="relative mt-6 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3.5 text-sm text-ink"
            >
              {FORM_ERROR_TEXT[formError]}{" "}
              <a href={SUPPORT_PHONE_HREF} className="font-mono text-brand-glow underline-offset-4 hover:underline">
                {SUPPORT_PHONE}
              </a>
            </div>
          )}

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
              disabled={pending}
              aria-busy={pending}
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 font-mono text-[11px] uppercase tracking-label text-bg transition hover:bg-brand hover:text-ink disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "Отправляем…" : "Отправить"}
              <ArrowUpRight
                size={14}
                className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </>
      )}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: { id: string; text: string };
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
      {hint && <p className="mt-2 text-xs text-ink-dim">{hint}</p>}
      {error && (
        <p id={error.id} className="mt-2 text-sm text-red-400">
          {error.text}
        </p>
      )}
    </div>
  );
}

function PhoneInput({
  id,
  name,
  autoComplete,
  required,
  defaultValue,
  invalidProps,
}: {
  id: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  invalidProps: Record<string, unknown>;
}) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-hairline-strong bg-bg/40 transition focus-within:border-brand/60 has-[[aria-invalid=true]]:border-red-400/70">
      <span className="flex items-center gap-2 border-r border-hairline-strong px-4 font-mono text-sm text-ink-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-glow" />
        +420
      </span>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        placeholder="000 000 00 00"
        autoComplete={autoComplete}
        required={required}
        maxLength={PHONE_INPUT_MAX}
        defaultValue={defaultValue}
        className="flex-1 bg-transparent px-4 py-3.5 font-mono text-sm text-ink placeholder:text-ink-dim focus:outline-none"
        {...invalidProps}
      />
    </div>
  );
}
