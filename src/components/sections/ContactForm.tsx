"use client";

import {
  ArrowUpRight,
  Banknote,
  ChevronDown,
  CircleCheck,
  CreditCard,
  Phone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { setAudience, useAudience, type Audience } from "@/lib/audience";
import { submitLead } from "@/lib/leads/actions";
import { onLeadPrefill } from "@/lib/leads/prefill";
import { useReveal } from "@/lib/useReveal";
import { PhotoField } from "./PhotoField";
import {
  EMAIL_MAX,
  MESSAGE_MAX,
  NAME_MAX,
  PAYMENT_METHODS,
  UTM_KEYS,
} from "@/lib/leads/constants";
import { AddressInput } from "./AddressInput";
import { DeliveryQuote } from "./DeliveryQuote";
import { IcoField } from "./IcoField";
import { quoteDelivery, type DeliveryQuoteRequest } from "@/lib/pricing";
import { PhoneInput } from "./PhoneInput";
import { SkoroStamp } from "./SkoroStamp";
import { checkRequiredFields, FIELD_ORDER } from "@/lib/leads/client-validation";
import type {
  FieldErrorCode,
  LeadField,
  LeadFormState,
  LeadKind,
} from "@/lib/leads/schema";

// Форма — бумажная накладная на тёмном фоне секции, как бланк договора в Individual:
// бумага #EFE9F6, чернила #1D1425, ячейки полей разделены линиями, как в бланке.
const inputClass =
  "block w-full bg-transparent py-1 text-base text-[#1D1425] placeholder:text-[#1D1425]/60 focus:outline-none";

const SUPPORT_PHONE = "+420 795 402 571";
const SUPPORT_PHONE_HREF = "tel:+420795402571";

const INITIAL_STATE: LeadFormState = { status: "idle" };

const KIND_LABEL: Record<LeadKind, string> = {
  delivery: "Доставка",
  question: "Вопрос",
};

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
  email: "Проверьте email: например, name@company.cz.",
  phone: "Проверьте номер телефона: например, +420 777 123 456.",
  recipientPhone: "Проверьте номер телефона получателя.",
  paymentMethod: "Выберите способ оплаты.",
  customerType: "Выберите: компания или частное лицо.",
  ico: "Проверьте IČO: 8 цифр, контрольная цифра не сходится.",
  photo: "Подходят только фото JPG, PNG или WebP.",
};

// Пустое обязательное поле: говорим, что именно нужно, а не просто «заполните».
const REQUIRED_FIELD_TEXT: Partial<Record<LeadField, string>> = {
  email: "Укажите email — на него ответим.",
  phone: "Укажите телефон: по нему уточним детали доставки.",
  ico: "Укажите IČO компании: 8 цифр.",
  pickupAddress: "Укажите, откуда забрать отправление.",
  deliveryAddress: "Укажите, куда доставить отправление.",
  paymentMethod: "Выберите способ оплаты.",
};

// Названия полей для сводки ошибок у кнопки отправки.
const FIELD_LABEL: Partial<Record<LeadField, string>> = {
  email: "Email",
  phone: "Телефон",
  ico: "IČO",
  pickupAddress: "Откуда",
  deliveryAddress: "Куда",
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

function fieldErrorText(field: LeadField, code: FieldErrorCode): string {
  // Сообщение обязательно только у вопроса: комментарий к доставке можно не писать.
  if (code === "required" && field === "message") return "Напишите ваш вопрос.";
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
    <section id="contact" className="relative overflow-hidden bg-bg py-24 md:py-32">
      <div aria-hidden className="absolute inset-0 grid-lines opacity-15" />
      <div className="noise-layer" />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-16">
          <h2 className="max-w-3xl font-display text-[clamp(2.25rem,6vw,4.75rem)] font-normal leading-[1] tracking-[-0.02em] text-ink">
            Мы свяжемся <span className="italic text-brand-glow">с вами!</span>
          </h2>

          <div className="max-w-md lg:ml-auto">
            <p className="text-base leading-relaxed text-ink-muted md:text-lg">
              Ответим в течение рабочего дня. Поля со звёздочкой обязательны.
            </p>
            <a
              href={SUPPORT_PHONE_HREF}
              className="mt-5 inline-flex max-w-full items-center gap-3 rounded-full border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-ink transition hover:border-brand hover:bg-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-glow md:px-5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/25 text-brand-glow">
                <Phone size={16} aria-hidden />
              </span>
              <span className="min-w-0 leading-snug">
                <span className="block text-[13px] text-ink-muted">Либо позвоните нам</span>
                <span className="block text-[15px] tabular-nums text-ink">{SUPPORT_PHONE}</span>
              </span>
            </a>
          </div>
        </div>

        <LeadForm key={formKey} onReset={() => setFormKey((k) => k + 1)} />
      </div>
    </section>
  );
}

function messageField(form: HTMLFormElement | null) {
  return form?.querySelector<HTMLTextAreaElement>('textarea[name="message"]') ?? null;
}

function LeadForm({ onReset }: { onReset: () => void }) {
  const [state, formAction, pending] = useActionState(submitLead, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);
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

  // Тарифы раздельные для бизнеса и частных лиц: расчёт по стратегии текущей версии сайта.
  // Сейчас стратегии возвращают null — блок цены не показывается (подготовка, P-35).
  const [quoteRequest, setQuoteRequest] = useState<DeliveryQuoteRequest>({
    pickupAddress: values?.pickupAddress ?? "",
    deliveryAddress: values?.deliveryAddress ?? "",
    paymentMethod: values?.paymentMethod || null,
  });
  const quote = formType === "delivery" ? quoteDelivery(audience, quoteRequest) : null;

  // «Я получатель»: поля получателя скрыты, сервер подставит имя и телефон заказчика.
  const [recipientIsCustomer, setRecipientIsCustomer] = useState(
    values?.recipientIsCustomer === "on",
  );

  // Название фирмы из ARES — в шапку накладной, как строка «Отправитель».
  const [company, setCompany] = useState<string | null>(null);

  // Time-trap: длительность заполнения по часам клиента, пишется в момент отправки.
  // React 19 вызывает onSubmit до того, как соберёт FormData для action.
  const mountedAtRef = useRef<number | null>(null);
  const elapsedRef = useRef<HTMLInputElement>(null);
  const [utm, setUtm] = useState("");
  useEffect(() => {
    mountedAtRef.current = Date.now();
    setUtm(readUtmFromLocation());
  }, []);

  // Кнопка «Обсудить с менеджером» из секции «Почему мы»: форма переходит на вопрос,
  // отмеченные карточки попадают в поле, если клиент его ещё не начал (или там наша же подстановка).
  // Поле сообщения одно в обоих типах заявки, поэтому текст ставим сразу, без ожидания рендера.
  // Подстановка относится только к вопросу: см. changeKind.
  const prefilledRef = useRef<string | null>(null);
  useEffect(
    () =>
      onLeadPrefill(({ kind, message }) => {
        const field = messageField(formRef.current);
        if (!field) return; // заявка уже отправлена — на экране квитанция
        setFormType(kind);
        if (kind !== "question") return;
        if (message && (field.value.trim() === "" || field.value === prefilledRef.current)) {
          field.value = message;
          prefilledRef.current = message;
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.message;
            return next;
          });
        }
      }),
    [],
  );

  /** Смена типа заявки. Текст из «Почему мы» живёт только в вопросе: на доставке убираем
   *  (если клиент его не правил), при возврате к вопросу ставим обратно в пустое поле. */
  function changeKind(kind: LeadKind) {
    const field = messageField(formRef.current);
    const prefill = prefilledRef.current;
    if (field && prefill) {
      if (kind === "delivery" && field.value === prefill) field.value = "";
      if (kind === "question" && field.value.trim() === "") {
        field.value = prefill;
        clearFieldError("message");
      }
    }
    setFormType(kind);
  }

  function recordElapsed() {
    if (mountedAtRef.current !== null && elapsedRef.current) {
      elapsedRef.current.value = String(Date.now() - mountedAtRef.current);
    }
  }

  /** Фокус на поле по имени: из сводки ошибок и после неудачной проверки. */
  function focusField(field: LeadField) {
    const target = formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`);
    target?.closest("details")?.setAttribute("open", "");
    target?.closest("[data-cell], fieldset")?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  }

  /** Проверка обязательных полей до отправки: ошибки у полей, фокус на первом незаполненном. */
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
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
      if (first) focusField(first);
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
  const showIco = isDelivery && customerType === "company";
  // Получатель и фото необязательны и свёрнуты; раскрываем, если в них уже есть ввод или ошибка.
  const extrasOpen = Boolean(
    values?.recipientName ||
      values?.recipientPhone ||
      fieldErrors.recipientName ||
      fieldErrors.recipientPhone ||
      fieldErrors.photo,
  );

  function errorProps(field: LeadField) {
    return fieldErrors[field]
      ? { "aria-invalid": true, "aria-describedby": `${field}-error` }
      : {};
  }

  function errorOf(field: LeadField) {
    const code = fieldErrors[field];
    return code ? { id: `${field}-error`, text: fieldErrorText(field, code) } : undefined;
  }

  const errorFields = FIELD_ORDER.filter((f) => fieldErrors[f]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      onChange={(e) => {
        const { name, value } = e.target as unknown as { name?: string; value: string };
        clearFieldError(name ?? "");
        // Поля, от которых зависит расчёт. Выбор подсказки адреса меняет value без события —
        // при подключении тарифов AddressInput должен сообщать о выборе (см. P-35).
        if (name === "pickupAddress" || name === "deliveryAddress") {
          setQuoteRequest((r) => ({ ...r, [name]: value }));
        } else if (name === "paymentMethod") {
          setQuoteRequest((r) => ({ ...r, paymentMethod: value || null }));
        }
      }}
      // Свои сообщения об ошибках вместо всплывающих подсказок браузера: те не видны у скрытых
      // radio способа оплаты. Без JS форма уходит на сервер, и он возвращает те же ошибки.
      noValidate
      className="relative mx-auto mt-14 max-w-[880px] scroll-mt-24 rounded-[6px] bg-[#EFE9F6] px-5 pb-8 pt-9 text-[#1D1425] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)] selection:bg-[#925AF4]/25 sm:px-10 sm:pb-10 sm:pt-11"
    >
      {/* Перфорация сверху, как у отрывного бланка */}
      <div
        aria-hidden
        className="absolute inset-x-6 top-3 h-px"
        style={{ backgroundImage: "repeating-linear-gradient(90deg, #B8ADC6 0 6px, transparent 6px 12px)" }}
      />

      <input type="hidden" name="customerType" value={customerType} />
      <input type="hidden" name="elapsedMs" ref={elapsedRef} defaultValue="" />
      <input type="hidden" name="utm" value={utm} />

      {/* Honeypot: скрыт от людей, но не через display:none — его боты пропускают. */}
      <div aria-hidden className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status === "success" ? (
        <Receipt kind={formType} audience={audience} onReset={onReset} />
      ) : (
        <>
          {/* Шапка накладной: что за заявка и единственный переключатель до первого поля */}
          <div className="flex flex-col gap-4 border-b border-[#1D1425]/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="font-display text-2xl leading-tight sm:text-3xl">
              {isDelivery ? "Заявка на доставку" : "Вопрос в Skoro"}
            </h3>
            <div role="radiogroup" aria-label="Тип заявки" className="inline-grid w-fit grid-cols-2 rounded-full border border-[#1D1425]/25 p-1">
              {(["delivery", "question"] as const).map((kind) => (
                <label key={kind} className="cursor-pointer">
                  <input
                    type="radio"
                    name="kind"
                    value={kind}
                    checked={formType === kind}
                    onChange={() => changeKind(kind)}
                    className="peer sr-only"
                  />
                  <span className="block rounded-full px-5 py-2 text-center text-[15px] text-[#1D1425]/70 transition hover:text-[#1D1425] peer-checked:bg-[#1D1425] peer-checked:text-[#F4EDE1] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#925AF4]">
                    {KIND_LABEL[kind]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {showIco && company && (
            <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-[#1D1425] px-3.5 py-1.5 text-sm text-[#F4EDE1]">
              <CircleCheck size={15} aria-hidden className="shrink-0 text-emerald-300" />
              <span className="truncate">Отправитель: {company}</span>
              <span className="hidden shrink-0 text-[#F4EDE1]/70 sm:inline">· проверено в ARES</span>
            </p>
          )}

          <Block
            title={isDelivery ? "Отправитель" : "Как с вами связаться"}
            aside={<AudienceToggle audience={audience} />}
          >
            <Grid>
              <Field label="Имя и фамилия" htmlFor="firstName">
                {/* Одно поле вместо двух; на сервере попадает в first_name. */}
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Как к вам обращаться"
                  autoComplete="name"
                  maxLength={NAME_MAX}
                  defaultValue={values?.firstName}
                  className={inputClass}
                />
              </Field>

              <Field label="Email" htmlFor="email" required error={errorOf("email")}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@company.cz"
                  required
                  autoComplete="email"
                  maxLength={EMAIL_MAX}
                  defaultValue={values?.email}
                  className={inputClass}
                  {...errorProps("email")}
                />
              </Field>

              <Field label="Телефон" htmlFor="phone" required={isDelivery} error={errorOf("phone")} wide={!showIco}>
                <PhoneInput
                  id="phone"
                  name="phone"
                  autoComplete="tel"
                  required={isDelivery}
                  defaultValue={values?.phone}
                  invalidProps={errorProps("phone")}
                />
              </Field>

              {showIco && (
                <Field label="IČO компании" htmlFor="ico" required error={errorOf("ico")}>
                  <IcoField
                    defaultValue={values?.ico}
                    className={inputClass}
                    invalidProps={errorProps("ico")}
                    hideStatus={Boolean(fieldErrors.ico)}
                    onCompanyChange={setCompany}
                  />
                </Field>
              )}
            </Grid>
          </Block>

          {isDelivery && (
            <Block title="Маршрут">
              <Grid single>
                <Field label="Откуда" htmlFor="pickupAddress" required error={errorOf("pickupAddress")} route="from">
                  <AddressInput
                    id="pickupAddress"
                    name="pickupAddress"
                    defaultValue={values?.pickupAddress}
                    className={inputClass}
                    invalidProps={errorProps("pickupAddress")}
                  />
                </Field>
                <Field label="Куда" htmlFor="deliveryAddress" required error={errorOf("deliveryAddress")} route="to">
                  <AddressInput
                    id="deliveryAddress"
                    name="deliveryAddress"
                    defaultValue={values?.deliveryAddress}
                    className={inputClass}
                    invalidProps={errorProps("deliveryAddress")}
                  />
                </Field>
                <label className="flex cursor-pointer items-center gap-3 bg-[#EFE9F6] px-4 py-3.5 transition has-[:focus-visible]:shadow-[inset_0_0_0_2px_#925AF4]">
                  <input
                    type="checkbox"
                    name="recipientIsCustomer"
                    checked={recipientIsCustomer}
                    onChange={(e) => setRecipientIsCustomer(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-[#1D1425]/50 transition peer-checked:border-[#1D1425] peer-checked:bg-[#1D1425]"
                  >
                    <svg viewBox="0 0 12 12" className={`h-3 w-3 text-[#F4EDE1] ${recipientIsCustomer ? "" : "hidden"}`}>
                      <path d="M2 6.5 4.8 9 10 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-[15px]">Получатель — я сам</span>
                </label>
              </Grid>

              <DeliveryQuote quote={quote} />

              <details open={extrasOpen} className="group mt-3 border border-[#1D1425]/15">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-[15px] transition hover:bg-[#1D1425]/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#925AF4] [&::-webkit-details-marker]:hidden">
                  <span>
                    {recipientIsCustomer ? "Фото отправления" : "Получатель и фото отправления"}
                    <span className="ml-2 text-[13px] text-[#1D1425]/70">необязательно</span>
                  </span>
                  <ChevronDown size={18} aria-hidden className="shrink-0 transition group-open:rotate-180" />
                </summary>
                <div className="grid grid-cols-1 gap-px border-t border-[#1D1425]/15 bg-[#1D1425]/15 sm:grid-cols-2">
                  {!recipientIsCustomer && (
                    <>
                      <Field label="Имя получателя" htmlFor="recipientName" error={errorOf("recipientName")}>
                        {/* autoComplete off: браузер иначе подставит имя самого заказчика. */}
                        <input
                          id="recipientName"
                          name="recipientName"
                          type="text"
                          placeholder="Кто примет отправление"
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
                  <div data-cell className="bg-[#EFE9F6] px-4 py-3 sm:col-span-2">
                    <PhotoField serverError={errorOf("photo")?.text} onBusyChange={setPhotoBusy} />
                  </div>
                </div>
              </details>
            </Block>
          )}

          <Block title={isDelivery ? "Отправление и оплата" : "Ваш вопрос"}>
            {isDelivery && (
              <fieldset
                className="mb-3"
                aria-describedby={fieldErrors.paymentMethod ? "paymentMethod-error" : undefined}
              >
                <legend className="mb-2 text-[13px] text-[#1D1425]/70">
                  Способ оплаты
                  <RequiredMark />
                </legend>
                <div className="grid grid-cols-1 gap-px border border-[#1D1425]/15 bg-[#1D1425]/15 sm:grid-cols-2">
                  {PAYMENT_METHODS.map((method) => (
                    <ChoiceCell
                      key={method}
                      name="paymentMethod"
                      value={method}
                      label={PAYMENT_LABEL[method]}
                      Icon={PAYMENT_ICON[method]}
                      defaultChecked={values?.paymentMethod === method}
                      invalid={Boolean(fieldErrors.paymentMethod)}
                    />
                  ))}
                </div>
                {errorOf("paymentMethod") && (
                  <p id="paymentMethod-error" className="mt-2 text-sm text-[#B3261E]">
                    {errorOf("paymentMethod")?.text}
                  </p>
                )}
              </fieldset>
            )}

            <Grid single>
              <Field label={isDelivery ? "Комментарий по заказу" : "Вопрос"} htmlFor="message" required={!isDelivery} error={errorOf("message")}>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  placeholder={
                    isDelivery
                      ? "Ваши заметки по доставке. Например, что нужно доставить, вес и габариты."
                      : "Опишите ваш вопрос."
                  }
                  required={!isDelivery}
                  maxLength={MESSAGE_MAX}
                  defaultValue={values?.message}
                  className={`${inputClass} min-h-[112px] resize-y`}
                  {...errorProps("message")}
                />
              </Field>
            </Grid>
          </Block>

          {errorFields.length > 0 && (
            <div className="mt-8 border border-[#B3261E]/35 bg-[#B3261E]/[0.06] px-4 py-3.5 text-[15px] leading-relaxed">
              Заполните или исправьте:{" "}
              {errorFields.map((f, i) => (
                <span key={f}>
                  {i > 0 && ", "}
                  <button
                    type="button"
                    onClick={() => focusField(f)}
                    className="underline decoration-[#B3261E]/50 underline-offset-4 transition hover:decoration-[#B3261E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#925AF4]"
                  >
                    {FIELD_LABEL[f]}
                  </button>
                </span>
              ))}
              .
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="mt-6 border border-[#B3261E]/35 bg-[#B3261E]/[0.06] px-4 py-3.5 text-[15px] leading-relaxed"
            >
              {FORM_ERROR_TEXT[formError]}{" "}
              <a href={SUPPORT_PHONE_HREF} className="font-medium tabular-nums underline underline-offset-4">
                {SUPPORT_PHONE}
              </a>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-5 sm:flex-row-reverse sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={pending || photoBusy}
              aria-busy={pending || photoBusy}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1D1425] px-7 py-4 text-[15px] font-medium text-[#F4EDE1] transition hover:bg-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#925AF4] disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:shrink-0"
            >
              {pending ? "Отправляем…" : photoBusy ? "Обрабатываем фото…" : isDelivery ? "Отправить заявку" : "Отправить вопрос"}
              <ArrowUpRight
                size={16}
                aria-hidden
                className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </button>
            <p className="max-w-md text-[13px] leading-relaxed text-[#1D1425]/70">
              Отправляя форму, вы соглашаетесь с обработкой персональных
              данных в соответствии с политикой конфиденциальности.
            </p>
          </div>

          {/* Под кнопкой — только страховка и только для доставки; у вопроса строки нет. */}
          {isDelivery && (
            <p className="mt-6 flex items-center gap-2 border-t border-dotted border-[#B8ADC6] pt-5 text-sm text-[#1D1425]/70">
              <ShieldCheck size={16} aria-hidden className="shrink-0 text-[#925AF4]" />
              Отправление застраховано
            </p>
          )}
        </>
      )}
    </form>
  );
}

/**
 * Квитанция после отправки: что будет дальше и печать Skoro.
 * Печать «опускается» на лист один раз — единственное движение формы.
 */
function Receipt({
  kind,
  audience,
  onReset,
}: {
  kind: LeadKind;
  audience: Audience;
  onReset: () => void;
}) {
  const ref = useReveal<HTMLDivElement>();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Кнопка отправки исчезла: переводим фокус и экран на квитанцию, чтобы не потерять пользователя.
  useEffect(() => {
    const heading = headingRef.current;
    heading?.focus({ preventScroll: true });
    heading?.closest("form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const steps =
    kind === "question"
      ? ["Ответим в течение рабочего дня — на email или по телефону."]
      : audience === "business"
        ? [
            "Менеджер позвонит в течение рабочего дня.",
            "Уточним задачи, объёмы и цену.",
            "Заключим договор и подключим вас за 1 рабочий день.",
          ]
        : ["Менеджер позвонит в течение рабочего дня.", "Уточним детали и стоимость доставки."];

  const date = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Prague",
  }).format(new Date());

  return (
    <div ref={ref} data-reveal role="status" className="relative pb-24 sm:pb-0">
      <div className="flex items-baseline justify-between gap-4 border-b border-[#1D1425]/80 pb-5">
        <h3 ref={headingRef} tabIndex={-1} className="font-display text-2xl leading-tight focus:outline-none sm:text-3xl">
          {kind === "question" ? "Вопрос получен" : "Заявка принята"}
        </h3>
        <span className="shrink-0 text-sm text-[#1D1425]/70">{date}</span>
      </div>

      <p className="mt-6 text-[13px] text-[#1D1425]/70">Что дальше</p>
      <ol className="mt-3 max-w-[30rem] space-y-3">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-base leading-snug sm:text-lg">
            <span className="w-5 shrink-0 font-display text-[#925AF4]">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center rounded-full border border-[#1D1425]/30 px-6 py-3.5 text-[15px] transition hover:border-[#1D1425] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#925AF4]"
        >
          Отправить ещё одну
        </button>
        <a href={SUPPORT_PHONE_HREF} className="text-[15px] text-[#1D1425]/70 underline decoration-[#1D1425]/30 underline-offset-4 transition hover:text-[#1D1425]">
          Срочно? {SUPPORT_PHONE}
        </a>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-4 right-0 select-none opacity-0 mix-blend-multiply transition-[opacity,transform] delay-200 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] [transform:rotate(-12deg)_scale(1.5)] motion-reduce:opacity-90 motion-reduce:transition-none motion-reduce:[transform:rotate(-12deg)] sm:bottom-0 sm:right-2 [.is-visible_&]:opacity-90 [.is-visible_&]:[transform:rotate(-12deg)_scale(1)]"
      >
        <SkoroStamp top="SKORO U VÁS · KURÝRNÍ SLUŽBA" bottom="PŘIJATO" className="h-28 w-28 sm:h-40 sm:w-40" />
      </div>
    </div>
  );
}

/** Переключение версии сайта текстовой ссылкой: второй переключатель-«таблетка» до полей не нужен. */
function AudienceToggle({ audience }: { audience: Audience }) {
  const next: Audience = audience === "business" ? "personal" : "business";
  return (
    <button
      type="button"
      onClick={() => setAudience(next)}
      className="text-sm text-[#1D1425]/70 underline decoration-[#1D1425]/30 underline-offset-4 transition hover:text-[#1D1425] hover:decoration-[#925AF4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#925AF4]"
    >
      {audience === "business" ? "Заказываете как частное лицо?" : "Заказываете для компании?"}
    </button>
  );
}

/** Раздел накладной: подпись и, при необходимости, действие справа. */
function Block({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-[15px] font-semibold">{title}</h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Ячейки бланка: линии между ними — это просвет фона сетки (gap-px). */
function Grid({ single, children }: { single?: boolean; children: ReactNode }) {
  return (
    <div
      className={`grid grid-cols-1 gap-px border border-[#1D1425]/15 bg-[#1D1425]/15 ${single ? "" : "sm:grid-cols-2"}`}
    >
      {children}
    </div>
  );
}

function RequiredMark() {
  return (
    <>
      <span aria-hidden className="ml-0.5 text-[#925AF4]">*</span>
      <span className="sr-only"> (обязательно)</span>
    </>
  );
}

/** Ячейка выбора (radio) с иконкой. */
function ChoiceCell({
  name,
  value,
  label,
  Icon,
  defaultChecked,
  invalid,
}: {
  name: string;
  value: string;
  label: string;
  Icon: LucideIcon;
  defaultChecked?: boolean;
  invalid?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 transition has-[:checked]:bg-[#E3D8F2] has-[:focus-visible]:shadow-[inset_0_0_0_2px_#925AF4] ${
        invalid ? "bg-[#F6E4E6]" : "bg-[#EFE9F6] hover:bg-[#E9E1F3]"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        required
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <Icon size={20} aria-hidden className="shrink-0 text-[#1D1425]/70 peer-checked:text-[#925AF4]" />
      <span className="flex-1 text-base">{label}</span>
      <span
        aria-hidden
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#1D1425]/50 transition peer-checked:border-[#1D1425]"
      >
        <span className="h-2.5 w-2.5 scale-0 rounded-full bg-[#1D1425] transition [label:has(:checked)_&]:scale-100" />
      </span>
    </label>
  );
}

function Field({
  label,
  htmlFor,
  required,
  error,
  wide,
  route,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: { id: string; text: string };
  wide?: boolean;
  /** Точка маршрута слева: «откуда» — кольцо, «куда» — заливка; между ними пунктир. */
  route?: "from" | "to";
  children: ReactNode;
}) {
  return (
    <div
      data-cell
      className={`relative px-4 pb-3 pt-3 transition focus-within:shadow-[inset_0_0_0_2px_#925AF4] ${
        error ? "bg-[#F6E4E6]" : "bg-[#EFE9F6] focus-within:bg-[#F5F1FA]"
      } ${wide ? "sm:col-span-2" : ""} ${route ? "pl-11" : ""}`}
    >
      {route && (
        <>
          <span
            aria-hidden
            className={`absolute left-4 top-[2.625rem] h-3 w-3 rounded-full ${
              route === "from" ? "border-2 border-[#1D1425] bg-[#EFE9F6]" : "bg-[#925AF4]"
            }`}
          />
          <span
            aria-hidden
            className={`absolute left-[21px] w-0 border-l-2 border-dashed border-[#1D1425]/35 ${
              route === "from" ? "-bottom-px top-[3.375rem]" : "-top-px h-[2.7rem]"
            }`}
          />
        </>
      )}
      <label htmlFor={htmlFor} className="block text-[13px] leading-5 text-[#1D1425]/70">
        {label}
        {required && <RequiredMark />}
      </label>
      {children}
      {error && (
        <p id={error.id} className="mt-1.5 text-sm text-[#B3261E]">
          {error.text}
        </p>
      )}
    </div>
  );
}
