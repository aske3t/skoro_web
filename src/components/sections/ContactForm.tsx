"use client";

import { ArrowUpRight, Banknote, CreditCard, Phone, type LucideIcon } from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AudienceSwitch } from "@/components/layout/AudienceSwitch";
import { useAudience } from "@/lib/audience";
import { submitLead } from "@/lib/leads/actions";
import { PhotoField } from "./PhotoField";
import {
  EMAIL_MAX,
  MESSAGE_MAX,
  NAME_MAX,
  PAYMENT_METHODS,
  UTM_KEYS,
} from "@/lib/leads/constants";
import { AddressInput } from "./AddressInput";
import { IcoField } from "./IcoField";
import { PhoneInput } from "./PhoneInput";
import { checkRequiredFields, FIELD_ORDER } from "@/lib/leads/client-validation";
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
  not_found: "Фирма с таким IČO не найдена в реестре ARES.",
  inactive: "По данным ARES фирма с этим IČO закрыта.",
};

const PAYMENT_ICON: Record<(typeof PAYMENT_METHODS)[number], LucideIcon> = {
  cash: Banknote,
  online: CreditCard,
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
  customerType: "Выберите: компания или частное лицо.",
  ico: "Проверьте IČO: 8 цифр, контрольная цифра не сходится.",
  photo: "Подходят только фото JPG, PNG или WebP.",
};

// Названия полей для сводки ошибок у кнопки отправки.
const FIELD_LABEL: Partial<Record<LeadField, string>> = {
  firstName: "Имя и фамилия",
  email: "Email",
  phone: "Телефон",
  ico: "IČO",
  pickupAddress: "Адрес забора",
  deliveryAddress: "Адрес доставки",
  recipientName: "Имя получателя",
  recipientPhone: "Телефон получателя",
  paymentMethod: "Способ оплаты",
  message: "Сообщение",
  photo: "Фото",
};

const FORM_ERROR_TEXT = {
  validation: "Проверьте поля формы.",
  rate_limited: "Слишком много заявок за короткое время. Попробуйте позже или позвоните нам:",
  server_error: "Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам:",
} as const;

// Для выбора из вариантов «заполните» не подходит.
const REQUIRED_FIELD_TEXT: Partial<Record<LeadField, string>> = {
  paymentMethod: "Выберите способ оплаты.",
};

function fieldErrorText(field: LeadField, code: FieldErrorCode): string {
  return (
    (code === "invalid" && INVALID_FIELD_TEXT[field]) ||
    (code === "required" && REQUIRED_FIELD_TEXT[field]) ||
    FIELD_ERROR_TEXT[code]
  );
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

        {/* Версия сайта видна и здесь: клиент, пришедший к форме, может переключиться (P-31). */}
        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-5">
          <p className="font-mono text-[11px] uppercase tracking-label text-ink-muted">
            Заявка оформляется
          </p>
          <AudienceSwitch />
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
  // Ошибки полей: от сервера после отправки или от проверки в браузере до неё.
  // Исправленное поле снимает свою ошибку сразу при вводе.
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LeadField, FieldErrorCode>>>(
    () => (state.status === "error" ? (state.fieldErrors ?? {}) : {}),
  );
  const formError =
    state.status === "error" && state.code !== "validation" ? state.code : null;

  const [formType, setFormType] = useState<LeadKind>(values?.kind ?? "delivery");
  // Тип клиента следует за версией сайта: бизнес → компания с IČO, частные лица → без IČO.
  const audience = useAudience();
  const customerType = audience === "business" ? "company" : "person";
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.status === "error") setFormType(state.values.kind);
    setFieldErrors(state.status === "error" ? (state.fieldErrors ?? {}) : {});
  }

  // «Я получатель»: поля получателя скрыты, сервер подставит имя и телефон заказчика.
  const [recipientIsCustomer, setRecipientIsCustomer] = useState(
    values?.recipientIsCustomer === "on",
  );

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

  /** Проверка обязательных полей до отправки: ошибки у полей, фокус на первом незаполненном. */
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const data = new FormData(form);
    const get = (name: string) => String(data.get(name) ?? "");
    const errors = checkRequiredFields({
      kind: formType,
      customerType,
      email: get("email"),
      message: get("message"),
      phone: get("phone"),
      pickupAddress: get("pickupAddress"),
      deliveryAddress: get("deliveryAddress"),
      paymentMethod: get("paymentMethod"),
      ico: get("ico"),
    });

    if (Object.keys(errors).length > 0) {
      e.preventDefault(); // action не вызывается
      setFieldErrors(errors);
      const first = FIELD_ORDER.find((f) => errors[f]);
      const target = first ? form.querySelector<HTMLElement>(`[name="${first}"]`) : null;
      target?.closest("fieldset, div")?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
      return;
    }
    recordElapsed();
  }

  function clearFieldError(name: string) {
    if (!(name in fieldErrors)) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name as LeadField];
      return next;
    });
  }

  // Пока фото сжимается в браузере, отправку блокируем.
  const [photoBusy, setPhotoBusy] = useState(false);

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
      onSubmit={handleSubmit}
      onChange={(e) => clearFieldError((e.target as unknown as { name?: string }).name ?? "")}
      // Свои сообщения об ошибках вместо всплывающих подсказок браузера: те не видны у скрытых
      // radio способа оплаты. Без JS форма уходит на сервер, и он возвращает те же ошибки.
      noValidate
      className="relative mt-16 overflow-hidden rounded-[1.75rem] border border-hairline-strong bg-bg-soft/60 p-8 shadow-card backdrop-blur-sm md:p-12"
    >
      <div className="noise-layer rounded-[1.75rem]" />
      <input type="hidden" name="kind" value={formType} />
      <input type="hidden" name="customerType" value={customerType} />
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
          <div className="relative space-y-10">
            <FormSection index="01" title="Контакты">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="Имя и фамилия" htmlFor="firstName" error={errorOf("firstName")}>
                  {/* Одно поле вместо двух; на сервере попадает в first_name. */}
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="Иван Иванов"
                    autoComplete="name"
                    maxLength={NAME_MAX}
                    defaultValue={values?.firstName}
                    className={inputClass}
                    {...errorProps("firstName")}
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

                {isDelivery && customerType === "company" && (
                  <Field label="IČO компании" htmlFor="ico" required error={errorOf("ico")}>
                    <IcoField
                      defaultValue={values?.ico}
                      className={inputClass}
                      invalidProps={errorProps("ico")}
                      hideStatus={Boolean(fieldErrors.ico)}
                    />
                  </Field>
                )}

                {isDelivery && (
                  <label className="flex w-fit cursor-pointer items-center gap-3 md:col-span-2">
                    <input
                      type="checkbox"
                      name="recipientIsCustomer"
                      checked={recipientIsCustomer}
                      onChange={(e) => setRecipientIsCustomer(e.target.checked)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className="flex h-5 w-5 items-center justify-center rounded-md border border-hairline-strong bg-bg/40 transition peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/50"
                    >
                      <svg viewBox="0 0 12 12" className={`h-3 w-3 text-ink ${recipientIsCustomer ? "" : "hidden"}`}>
                        <path d="M2 6.5 4.8 9 10 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="text-sm text-ink-muted">Я получатель</span>
                  </label>
                )}
              </div>
            </FormSection>

            {isDelivery && (
              <FormSection index="02" title="Маршрут">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Field label="Адрес забора" htmlFor="pickupAddress" required error={errorOf("pickupAddress")}>
                      <AddressInput
                        id="pickupAddress"
                        name="pickupAddress"
                        defaultValue={values?.pickupAddress}
                        className={inputClass}
                        invalidProps={errorProps("pickupAddress")}
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Адрес доставки" htmlFor="deliveryAddress" required error={errorOf("deliveryAddress")}>
                      <AddressInput
                        id="deliveryAddress"
                        name="deliveryAddress"
                        defaultValue={values?.deliveryAddress}
                        className={inputClass}
                        invalidProps={errorProps("deliveryAddress")}
                      />
                    </Field>
                  </div>
                  {!recipientIsCustomer && (
                    <>
                      <Field label="Имя получателя" htmlFor="recipientName" error={errorOf("recipientName")}>
                        {/* autoComplete off: браузер иначе подставит имя самого заказчика. */}
                        <input
                          id="recipientName"
                          name="recipientName"
                          type="text"
                          placeholder="Пётр Новак"
                          autoComplete="off"
                          maxLength={NAME_MAX}
                          defaultValue={values?.recipientName}
                          className={inputClass}
                          {...errorProps("recipientName")}
                        />
                      </Field>
                      <Field label="Телефон получателя" htmlFor="recipientPhone" error={errorOf("recipientPhone")}>
                        <PhoneInput
                          id="recipientPhone"
                          name="recipientPhone"
                          defaultValue={values?.recipientPhone}
                          invalidProps={errorProps("recipientPhone")}
                        />
                      </Field>
                    </>
                  )}
                </div>
              </FormSection>
            )}

            <FormSection index={isDelivery ? "03" : "02"} title={isDelivery ? "Детали заказа" : "Ваш вопрос"}>
              <div className="space-y-6">
                {isDelivery && (
                  <fieldset aria-describedby={fieldErrors?.paymentMethod ? "paymentMethod-error" : undefined}>
                    <legend className="mb-3 block font-mono text-[11px] uppercase tracking-label text-ink-muted">
                      Способ оплаты
                      <span className="ml-1 text-brand-glow">*</span>
                    </legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {PAYMENT_METHODS.map((method) => (
                        <ChoiceCard
                          key={method}
                          name="paymentMethod"
                          value={method}
                          label={PAYMENT_LABEL[method]}
                          Icon={PAYMENT_ICON[method]}
                          defaultChecked={values?.paymentMethod === method}
                          required
                          invalid={Boolean(fieldErrors.paymentMethod)}
                        />
                      ))}
                    </div>
                    {errorOf("paymentMethod") && (
                      <p id="paymentMethod-error" className="mt-2 text-sm text-red-400">
                        {errorOf("paymentMethod")?.text}
                      </p>
                    )}
                  </fieldset>
                )}

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

                {isDelivery && (
                  <PhotoField serverError={errorOf("photo")?.text} onBusyChange={setPhotoBusy} />
                )}
              </div>
            </FormSection>
          </div>

          {Object.keys(fieldErrors).length > 0 && (
            <div
              role="alert"
              className="relative mt-8 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3.5 text-sm text-ink"
            >
              Заполните или исправьте:{" "}
              {FIELD_ORDER.filter((f) => fieldErrors[f])
                .map((f) => FIELD_LABEL[f])
                .join(", ")}
              .
            </div>
          )}

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
              disabled={pending || photoBusy}
              aria-busy={pending || photoBusy}
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

/** Блок формы с номером и заголовком — визуально делит длинную форму на шаги. */
function FormSection({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand/40 bg-brand/10 font-mono text-[10px] text-brand-glow">
          {index}
        </span>
        <h4 className="font-mono text-[11px] uppercase tracking-label text-ink">{title}</h4>
        <span aria-hidden className="h-px flex-1 bg-hairline" />
      </div>
      {children}
    </section>
  );
}

/** Карточка выбора (radio) с иконкой. */
function ChoiceCard({
  name,
  value,
  label,
  Icon,
  defaultChecked,
  required,
  invalid,
}: {
  name: string;
  value: string;
  label: string;
  Icon: LucideIcon;
  defaultChecked?: boolean;
  required?: boolean;
  invalid?: boolean;
}) {
  return (
    <label className="group relative cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        required={required}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className={`flex items-center gap-3 rounded-2xl border bg-bg/40 p-3.5 transition ${invalid ? "border-red-400/70" : "border-hairline-strong"} hover:border-ink/30 peer-checked:border-brand/70 peer-checked:bg-brand/10 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/50`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink-muted transition group-has-[:checked]:bg-brand group-has-[:checked]:text-ink">
          <Icon size={18} aria-hidden />
        </span>
        <span className="flex-1 font-mono text-sm text-ink-muted transition group-has-[:checked]:text-ink">
          {label}
        </span>
        <span
          aria-hidden
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-hairline-strong transition group-has-[:checked]:border-brand"
        >
          <span className="h-2.5 w-2.5 scale-0 rounded-full bg-brand transition group-has-[:checked]:scale-100" />
        </span>
      </span>
    </label>
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
