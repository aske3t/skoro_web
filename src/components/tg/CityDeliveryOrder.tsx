"use client";

import { CalendarClock, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import {
  previewOrderPrice,
  submitOptionOrder,
  type OrderFormData,
  type PricePreviewState,
  type SubmitOrderState,
} from "@/app/tg/actions";
import { AddressInput } from "@/components/sections/AddressInput";
import { PhoneInput } from "@/components/sections/PhoneInput";
import { PhotoField } from "@/components/sections/PhotoField";
import { MESSAGE_MAX, NAME_MAX } from "@/lib/leads/constants";
import { CITY_DELIVERY_LABELS as LABEL } from "@/lib/options/forms/constants";

// Форма «Доставка по городу» в Mini App. Карточка формы — светлая, как форма заявки на сайте:
// поля сайта (адрес, телефон, фото) нарисованы в её цветах. Фон и заголовок — из темы Telegram.

const PREVIEW_DEBOUNCE_MS = 300;
const OTHER_ADDRESS = ""; // значение «Другой адрес»: точка не выбрана, адрес вводится вручную
const TIME_CODES = ["slot_past", "slot_outside_hours", "invalid_time"];
const FIELD_ORDER = [
  "pickupLocationId",
  "pickupAddress",
  "deliveryAddress",
  "deliveryAt",
  "recipientName",
  "recipientPhone",
  "comment",
  "photo",
];

const PAYMENT_LABEL: Record<string, string> = {
  invoice: "по счёту",
  cash: "наличными",
};

const FIELD_ERROR_TEXT: Record<string, string> = {
  required: "Заполните это поле.",
  invalid: "Проверьте значение.",
  too_long: "Слишком длинное значение.",
  too_large: "Фото слишком большое: не более 4 МБ.",
  slot_past: "Это время уже прошло: выберите другое.",
  slot_outside_hours: "В это время мы не работаем: выберите другое.",
  invalid_time: "Проверьте дату и время.",
};

const REQUIRED_TEXT: Record<string, string> = {
  pickupLocationId: "Выберите, откуда забрать.",
  pickupAddress: "Укажите, откуда забрать.",
  deliveryAddress: "Укажите, куда доставить.",
  deliveryAt: "Укажите дату и время.",
};

const INVALID_TEXT: Record<string, string> = {
  pickupLocationId: "Эта точка недоступна: выберите другую.",
  recipientPhone: "Проверьте номер: например, +420 777 123 456.",
  photo: "Подходят только фото JPG, PNG или WebP.",
};

const FORM_ERROR_TEXT: Record<string, string> = {
  unauthorized: "Сессия устарела. Закройте форму и откройте её заново из бота.",
  not_linked: "Этот Telegram больше не подключён. Попросите у менеджера ссылку-приглашение.",
  client_inactive: "Заказы для вашей компании сейчас недоступны. Свяжитесь с менеджером.",
  option_unavailable: "Эта услуга сейчас недоступна. Нажмите «Новый заказ» в боте заново.",
  tariff_invalid: "Не удалось рассчитать цену. Мы уже сообщили менеджеру — попробуйте позже.",
  server_error: "Не удалось отправить заказ. Попробуйте ещё раз.",
};

const inputClass =
  "block w-full bg-transparent py-1 text-base text-[#1D1425] placeholder:text-[#1D1425]/50 focus:outline-none";
const primaryButton =
  "inline-flex w-full items-center justify-center rounded-full bg-[#1D1425] px-6 py-3.5 text-[15px] font-medium text-[#F4EDE1] transition disabled:opacity-40";
const secondaryButton =
  "inline-flex w-full items-center justify-center rounded-full border border-[#1D1425]/30 px-6 py-3.5 text-[15px] font-medium transition";

type PriceStatus = { status: "idle" | "checking" } | PricePreviewState;

function errorText(field: string, code: string): string {
  if (code === "required") return REQUIRED_TEXT[field] ?? FIELD_ERROR_TEXT.required;
  if (code === "invalid") return INVALID_TEXT[field] ?? FIELD_ERROR_TEXT.invalid;
  return FIELD_ERROR_TEXT[code] ?? FIELD_ERROR_TEXT.invalid;
}

/** «2026-11-10T14:30» → «10.11.2026, 14:30». Время уже пражское: в форме его так и вводят. */
function formatLocal(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}, ${match[4]}:${match[5]}` : value;
}

function initialPickup({ locations, defaults }: OrderFormData): string | null {
  if (defaults.pickupLocationId) return defaults.pickupLocationId;
  if (locations.length === 0 || defaults.pickupAddress) return OTHER_ADDRESS;
  if (locations.length === 1) return locations[0].id;
  return null; // несколько точек и нет предзаполнения — пусть клиент выберет сам
}

export function CityDeliveryOrder({
  form,
  initData,
  clientOptionId,
  onDone,
}: {
  form: OrderFormData;
  initData: string;
  clientOptionId: string;
  onDone: (result: { number: number | null; total: number }) => void;
}) {
  const { locations, defaults } = form;
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<"form" | "summary">("form");
  const [pickup, setPickup] = useState<string | null>(() => initialPickup(form));
  const [mode, setMode] = useState<"asap" | "at">("asap");
  const [at, setAt] = useState("");
  const [price, setPrice] = useState<PriceStatus>({ status: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [summary, setSummary] = useState<[string, string][]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const requestRef = useRef(0);

  // Превью цены считает сервер тем же тарифом, что и заказ; клиент видит только свои цены.
  const pickupLocationId = pickup ?? "";
  useEffect(() => {
    const requestId = ++requestRef.current;
    if (mode === "at" && !at) {
      setPrice({ status: "idle" });
      return;
    }
    setPrice({ status: "checking" });
    const timer = setTimeout(async () => {
      try {
        const result = await previewOrderPrice(initData, clientOptionId, {
          deliveryMode: mode,
          deliveryAt: at,
          pickupLocationId,
        });
        if (requestId === requestRef.current) setPrice(result);
      } catch {
        if (requestId === requestRef.current) setPrice({ status: "error", code: "server_error" });
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [mode, at, pickupLocationId, initData, clientOptionId]);

  function clearErrors(...fields: string[]) {
    setErrors((prev) => {
      if (!fields.some((f) => f in prev)) return prev;
      const next = { ...prev };
      for (const f of fields) delete next[f];
      return next;
    });
  }

  function focusFirst(fieldErrors: Record<string, string>) {
    const first = FIELD_ORDER.find((f) => fieldErrors[f]);
    // Шаг формы мог быть скрыт: фокус — после того, как React его покажет.
    setTimeout(() => {
      const target = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
    }, 0);
  }

  function goToSummary() {
    const formElement = formRef.current;
    if (!formElement) return;
    const data = new FormData(formElement);
    const get = (name: string) => String(data.get(name) ?? "").trim();

    const missing: Record<string, string> = {};
    if (pickup === null) missing.pickupLocationId = "required";
    else if (pickup === OTHER_ADDRESS && !get("pickupAddress")) missing.pickupAddress = "required";
    if (!get("deliveryAddress")) missing.deliveryAddress = "required";
    if (mode === "at" && !at) missing.deliveryAt = "required";
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      focusFirst(missing);
      return;
    }
    if (price.status !== "ok") return;

    const location = locations.find((l) => l.id === pickup);
    const lines: [string, string][] = [
      [LABEL.pickup, location ? `${location.name}, ${location.address}` : get("pickupAddress")],
      [LABEL.deliveryAddress, get("deliveryAddress")],
      [LABEL.deliveryTime, mode === "at" ? `${formatLocal(at)} (по Праге)` : LABEL.asap],
    ];
    for (const [name, label] of [
      ["recipientName", LABEL.recipientName],
      ["recipientPhone", LABEL.recipientPhone],
      ["comment", LABEL.comment],
    ] as const) {
      if (get(name)) lines.push([label, get(name)]);
    }
    const photo = data.get("photo");
    if (photo instanceof File && photo.size > 0) lines.push([LABEL.photo, "приложено"]);
    lines.push(
      ["Оплата", PAYMENT_LABEL[form.paymentMethod] ?? form.paymentMethod],
      ["Слот", price.slotLabel],
      ["Цена", `${price.total} Kč`],
    );

    setSummary(lines);
    setFormError(null);
    setStep("summary");
    window.scrollTo({ top: 0 });
  }

  function showSubmitError(result: Extract<SubmitOrderState, { status: "error" }>) {
    const fieldErrors = result.fieldErrors ?? {};
    if (result.code === "validation" && Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setStep("form");
      focusFirst(fieldErrors);
      return;
    }
    if (TIME_CODES.includes(result.code)) {
      const timeError = { deliveryAt: result.code };
      setErrors(timeError);
      setStep("form");
      focusFirst(timeError);
      return;
    }
    setFormError(result.code in FORM_ERROR_TEXT ? result.code : "server_error");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter в поле и кнопка «Далее» на шаге формы ведут к сводке, а не к отправке.
    if (step === "form") {
      goToSummary();
      return;
    }
    if (pending) return;

    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      let result: SubmitOrderState;
      try {
        result = await submitOptionOrder(data);
      } catch {
        result = { status: "error", code: "server_error" };
      }
      if (result.status === "ok") onDone(result);
      else showSubmitError(result);
    });
  }

  const priceTimeError =
    price.status === "error" && TIME_CODES.includes(price.code)
      ? mode === "asap" && price.code === "slot_outside_hours"
        ? "Сейчас мы не работаем: выберите время в рабочие часы."
        : FIELD_ERROR_TEXT[price.code]
      : null;
  const timeError = errors.deliveryAt ? errorText("deliveryAt", errors.deliveryAt) : priceTimeError;
  const errorOf = (field: string) => (errors[field] ? errorText(field, errors[field]) : undefined);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onChange={(event) => {
        const name = (event.target as { name?: string }).name ?? "";
        if (name === "pickupLocationId") clearErrors("pickupLocationId", "pickupAddress");
        else if (name === "deliveryMode") clearErrors("deliveryAt");
        else clearErrors(name);
      }}
      noValidate
      className="rounded-[6px] bg-[#EFE9F6] px-4 py-5 text-[#1D1425] shadow-sm [color-scheme:light]"
    >
      <input type="hidden" name="initData" value={initData} />
      <input type="hidden" name="clientOptionId" value={clientOptionId} />

      <div hidden={step !== "form"} className="space-y-6">
        {locations.length > 0 ? (
          <fieldset aria-describedby={errors.pickupLocationId ? "pickupLocationId-error" : undefined}>
            <Legend required>{LABEL.pickup}</Legend>
            <div className="space-y-2">
              {locations.map((location) => (
                <Choice
                  key={location.id}
                  name="pickupLocationId"
                  value={location.id}
                  checked={pickup === location.id}
                  onChange={() => setPickup(location.id)}
                  title={location.name}
                  detail={location.address}
                />
              ))}
              <Choice
                name="pickupLocationId"
                value={OTHER_ADDRESS}
                checked={pickup === OTHER_ADDRESS}
                onChange={() => setPickup(OTHER_ADDRESS)}
                title="Другой адрес"
              />
            </div>
            {errors.pickupLocationId && (
              <ErrorText id="pickupLocationId-error">{errorText("pickupLocationId", errors.pickupLocationId)}</ErrorText>
            )}
            {pickup === OTHER_ADDRESS && (
              <div className="mt-3">
                <Field label="Адрес забора" htmlFor="pickupAddress" required error={errorOf("pickupAddress")}>
                  <AddressInput
                    id="pickupAddress"
                    name="pickupAddress"
                    defaultValue={defaults.pickupAddress}
                    className={inputClass}
                    invalidProps={invalidProps(errors.pickupAddress, "pickupAddress")}
                  />
                </Field>
              </div>
            )}
          </fieldset>
        ) : (
          <Field label={LABEL.pickup} htmlFor="pickupAddress" required error={errorOf("pickupAddress")}>
            <AddressInput
              id="pickupAddress"
              name="pickupAddress"
              defaultValue={defaults.pickupAddress}
              className={inputClass}
              invalidProps={invalidProps(errors.pickupAddress, "pickupAddress")}
            />
          </Field>
        )}

        <Field label={LABEL.deliveryAddress} htmlFor="deliveryAddress" required error={errorOf("deliveryAddress")}>
          <AddressInput
            id="deliveryAddress"
            name="deliveryAddress"
            className={inputClass}
            invalidProps={invalidProps(errors.deliveryAddress, "deliveryAddress")}
          />
        </Field>

        <fieldset>
          <Legend>{LABEL.deliveryTime}</Legend>
          <div className="grid grid-cols-2 gap-2">
            <Choice
              name="deliveryMode"
              value="asap"
              checked={mode === "asap"}
              onChange={() => setMode("asap")}
              title={LABEL.asap}
              Icon={Zap}
            />
            <Choice
              name="deliveryMode"
              value="at"
              checked={mode === "at"}
              onChange={() => setMode("at")}
              title="Ко времени"
              Icon={CalendarClock}
            />
          </div>
          {mode === "at" ? (
            <div className="mt-3">
              <Field label="Дата и время по Праге" htmlFor="deliveryAt" required error={timeError ?? undefined}>
                <input
                  id="deliveryAt"
                  name="deliveryAt"
                  type="datetime-local"
                  value={at}
                  onChange={(event) => setAt(event.target.value)}
                  className={inputClass}
                  {...invalidProps(timeError, "deliveryAt")}
                />
              </Field>
            </div>
          ) : (
            timeError && <ErrorText id="deliveryAt-error">{timeError}</ErrorText>
          )}
        </fieldset>

        <div className="space-y-6">
          <Field label={LABEL.recipientName} htmlFor="recipientName" error={errorOf("recipientName")}>
            <input
              id="recipientName"
              name="recipientName"
              type="text"
              autoComplete="off"
              maxLength={NAME_MAX}
              className={inputClass}
              {...invalidProps(errors.recipientName, "recipientName")}
            />
          </Field>
          <Field label={LABEL.recipientPhone} htmlFor="recipientPhone" error={errorOf("recipientPhone")}>
            <PhoneInput
              id="recipientPhone"
              name="recipientPhone"
              autoComplete="off"
              invalidProps={invalidProps(errors.recipientPhone, "recipientPhone")}
            />
          </Field>
        </div>

        <Field label={LABEL.comment} htmlFor="comment" error={errorOf("comment")}>
          <textarea
            id="comment"
            name="comment"
            rows={3}
            maxLength={MESSAGE_MAX}
            placeholder="Что везём, этаж, код домофона"
            className={`${inputClass} resize-y`}
            {...invalidProps(errors.comment, "comment")}
          />
        </Field>

        <PhotoField
          serverError={errors.photo ? errorText("photo", errors.photo) : undefined}
          onBusyChange={setPhotoBusy}
        />

        <p className="text-[15px]">
          Оплата: <span className="font-medium">{PAYMENT_LABEL[form.paymentMethod] ?? form.paymentMethod}</span>
        </p>

        <div className="border-t border-[#1D1425]/15 pt-4">
          <PriceLine price={price} />
          {formError && <FormError code={formError} />}
          <button type="submit" disabled={price.status !== "ok" || photoBusy} className={`mt-4 ${primaryButton}`}>
            {photoBusy ? "Обрабатываем фото…" : "Далее"}
          </button>
        </div>
      </div>

      <div hidden={step !== "summary"}>
        <h2 className="text-lg font-semibold">Проверьте заказ</h2>
        <dl className="mt-3 divide-y divide-[#1D1425]/10">
          {summary.map(([label, value]) => (
            <div key={label} className="py-2.5">
              <dt className="text-[13px] text-[#1D1425]/70">{label}</dt>
              <dd className="whitespace-pre-wrap break-words text-base">{value}</dd>
            </div>
          ))}
        </dl>
        {formError && <FormError code={formError} />}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setStep("form");
              setFormError(null);
            }}
            className={secondaryButton}
          >
            Изменить
          </button>
          <button type="submit" disabled={pending} aria-busy={pending} className={primaryButton}>
            {pending ? "Отправляем…" : "Отправить"}
          </button>
        </div>
      </div>
    </form>
  );
}

function invalidProps(error: string | null | undefined, field: string) {
  return error ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {};
}

function Legend({ required, children }: { required?: boolean; children: ReactNode }) {
  return (
    <legend className="mb-2 text-[13px] text-[#1D1425]/70">
      {children}
      {required && <RequiredMark />}
    </legend>
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

function ErrorText({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-sm text-[#B3261E]">
      {children}
    </p>
  );
}

function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[13px] text-[#1D1425]/70">
        {label}
        {required && <RequiredMark />}
      </label>
      <div
        className={`mt-1 border-b transition ${
          error ? "border-[#B3261E]" : "border-[#1D1425]/25 focus-within:border-[#925AF4]"
        }`}
      >
        {children}
      </div>
      {error && <ErrorText id={`${htmlFor}-error`}>{error}</ErrorText>}
    </div>
  );
}

function Choice({
  name,
  value,
  checked,
  onChange,
  title,
  detail,
  Icon,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  detail?: string;
  Icon?: LucideIcon;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-[4px] border px-3 py-3 transition has-[:focus-visible]:shadow-[0_0_0_2px_#925AF4] ${
        checked ? "border-[#925AF4] bg-[#E3D8F2]" : "border-[#1D1425]/15"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 shrink-0 accent-[#925AF4]"
      />
      {Icon && <Icon size={18} aria-hidden className="mt-0.5 shrink-0 text-[#1D1425]/70" />}
      <span className="min-w-0">
        <span className="block text-base leading-snug">{title}</span>
        {detail && <span className="block text-[13px] text-[#1D1425]/70">{detail}</span>}
      </span>
    </label>
  );
}

function PriceLine({ price }: { price: PriceStatus }) {
  const muted = "text-[15px] text-[#1D1425]/70";
  switch (price.status) {
    case "idle":
      return <p className={muted}>Выберите время — покажем цену.</p>;
    case "checking":
      return <p className={muted}>Считаем цену…</p>;
    case "ok":
      return (
        <p className="text-[15px]">
          <span className="text-xl font-semibold">{price.total} Kč</span>
          <span className="text-[#1D1425]/70"> · {price.slotLabel}</span>
        </p>
      );
    case "error":
      if (TIME_CODES.includes(price.code)) return <p className={muted}>Цена появится, когда время подойдёт.</p>;
      if (price.code === "tariff_invalid") {
        return <p className="text-[15px] text-[#B3261E]">Не удалось рассчитать цену. Свяжитесь с менеджером.</p>;
      }
      return <FormError code={price.code} />;
  }
}

function FormError({ code }: { code: string }) {
  return (
    <p role="alert" className="mt-3 text-[15px] text-[#B3261E]">
      {FORM_ERROR_TEXT[code] ?? FORM_ERROR_TEXT.server_error}
    </p>
  );
}
