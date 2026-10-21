# TASK-001: обработка контактной формы (лиды)

> Контекст проекта: [../STATE.md](../STATE.md), [../architecture/AS-IS.md](../architecture/AS-IS.md).
> Базовая ветка: `dev`. Рабочая ветка: `feature/contact-form`.
> Статус: к исполнению. Архитектурные решения ниже зафиксированы. Если какое-то из них
> мешает, остановись и опиши проблему, не меняй его самостоятельно.

## 1. Проблема

`src/components/sections/ContactForm.tsx` — главная точка конверсии B2B-сайта, но заявки из неё никуда не уходят:

- `onSubmit={(e) => e.preventDefault()}` — отправки нет;
- у полей нет атрибутов `name`, поэтому `FormData` пустая даже при наличии обработчика;
- обязательность полей (Email*, Сообщение*) только визуальная, `required` не выставлен;

Работа ведётся только в `dev`. Прод (`variant1`) в этой задаче не трогаем.

## 2. Цель

Каждая корректная заявка из контактной формы:

1. надёжно сохраняется в Supabase;
2. приводит к уведомлению владельца в Telegram;
3. даёт пользователю понятную обратную связь (отправка, успех, ошибка).

Спам не должен доходить до базы и уведомлений.

## 3. Архитектурные решения

| # | Решение | Почему |
|---|---|---|
| A1 | **Server Action** + `useActionState` (React 19). Форма работает и без JS (progressive enhancement). | Не нужен отдельный API-роут, валидация и запись происходят на сервере, путь минимальный. |
| A2 | **Таблица `public.leads`**, RLS включён **без политик**. Запись только с сервера Next.js через secret key в модуле с `import "server-only"`. | Anon key публичный. Если открыть anon insert-политику, спамер будет писать в таблицу напрямую через PostgREST в обход наших проверок. |
| A3 | **Одна zod-схема** в `lib/leads/schema.ts`, сервер — единственный источник истины. На клиенте только HTML-атрибуты (`required`, `maxLength`, `type`). | Правила не дублируются, клиентская валидация не является защитой. |
| A4 | **Антиспам**: honeypot, time-trap и rate-limit по `ip_hash` **через БД**. | In-memory лимиты на serverless не глобальны (см. `/api/geocode/search` в AS-IS). |
| A5 | **Уведомление в Telegram** через `after()` из `next/server`, за интерфейсом `notifyNewLead()`. Сбой уведомления лид **не теряет**. | Сначала сохраняем в БД, потом уведомляем. Ответ пользователю не ждёт Telegram. Позже можно добавить email-адаптер. |
| A6 | **Ошибки — это коды**, а не тексты. Русские тексты живут в компоненте. | Готовность к будущей i18n (cs/en/ru). |
| A7 | **Env читаются лениво**, в момент вызова, а не при импорте модуля. | Отсутствие ключа ломает только отправку формы, а не рендер страницы и не сборку (см. проблему с HTTP 500 в STATE). |

## 4. Модель данных

Файл `supabase/migrations/<YYYYMMDDHHMMSS>_create_leads.sql`:

```sql
create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('delivery', 'question')),
  first_name  text check (char_length(first_name) <= 100),
  last_name   text check (char_length(last_name) <= 100),
  email       text not null check (char_length(email) <= 254),
  phone       text check (char_length(phone) <= 20),
  message     text not null check (char_length(message) between 1 and 4000),
  utm         jsonb,
  ip_hash     text,
  status      text not null default 'new'
              check (status in ('new', 'in_progress', 'done', 'spam'))
);

create index leads_ip_hash_created_at_idx on public.leads (ip_hash, created_at desc);
create index leads_status_created_at_idx  on public.leads (status, created_at desc);

alter table public.leads enable row level security;
-- Политик нет намеренно: anon и authenticated не читают и не пишут.
-- Запись только с сервера Next.js через secret key (обходит RLS).
revoke all on public.leads from anon, authenticated;

comment on table  public.leads         is 'Заявки с контактной формы сайта';
comment on column public.leads.ip_hash is 'sha256(ip + LEAD_IP_SALT); только для rate-limit';
comment on column public.leads.utm     is 'utm_source / utm_medium / utm_campaign / utm_term / utm_content со страницы';
```

Тип `leads` добавь в `src/types/database.ts` вручную, в формате сгенерированного файла (`Row` / `Insert` / `Update`). Владелец перегенерирует типы после применения миграции. Разница должна быть нулевой, поэтому отметь это в отчёте.

## 5. Структура файлов

```
src/lib/supabase/admin.ts          server-only; createAdminClient() — ленивое чтение env
src/lib/leads/schema.ts            zod-схема, normalizePhone(), типы LeadFormValues / LeadFormState
src/lib/leads/spam.ts              hashIp(), getClientIp(headers), isRateLimited(client, ipHash)
src/lib/leads/notify.ts            notifyNewLead(lead), formatLeadMessage(lead), Telegram-адаптер
src/lib/leads/actions.ts           "use server"; submitLead(prevState, formData)
src/components/sections/ContactForm.tsx   подключение action, состояния UI
supabase/migrations/<ts>_create_leads.sql
src/lib/leads/*.test.ts            unit-тесты (vitest)
```

## 6. Контракт Server Action

```ts
type LeadField = "firstName" | "lastName" | "email" | "phone" | "message";
type FieldErrorCode = "required" | "invalid" | "too_long";

type LeadFormValues = {
  kind: "delivery" | "question";
  firstName: string; lastName: string; email: string; phone: string; message: string;
};

type LeadFormState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      code: "validation" | "rate_limited" | "server_error";
      fieldErrors?: Partial<Record<LeadField, FieldErrorCode>>;
      values: LeadFormValues; // чтобы форма не теряла ввод
    };

export async function submitLead(prev: LeadFormState, formData: FormData): Promise<LeadFormState>;
```

**Поток `submitLead`:**

1. Honeypot `website` заполнен → вернуть `{ status: "success" }` и **ничего не делать**. Боту не сообщаем об отказе.
2. `startedAt` присутствует и прошло < 3 с → то же, что в п. 1. Если `startedAt` отсутствует (JS выключен), не блокировать.
3. Распарсить поля zod-схемой. При ошибке → `validation` + `fieldErrors` + `values`.
4. `ip_hash = sha256(ip + LEAD_IP_SALT)`. IP берётся из первого значения `x-forwarded-for`, запасной вариант — `x-real-ip`. Если IP нет, `ip_hash = null` и rate-limit пропускается.
5. Rate-limit: ≥ 3 лида с тем же `ip_hash` за 10 минут → `rate_limited`. Константы вынести наверх модуля.
6. `insert` в `leads`. Ошибка → `console.error` + `server_error` + `values`.
7. `after(() => notifyNewLead(lead))` → вернуть `{ status: "success" }`.

**Правила полей (zod):**

| Поле | Правило |
|---|---|
| `kind` | `delivery` \| `question`, по умолчанию `delivery` |
| `firstName`, `lastName` | trim, ≤ 100, необязательные |
| `email` | trim, lowercase, валидный email, ≤ 254, обязательный |
| `phone` | необязательный; `normalizePhone()`: убрать пробелы, `-`, `(`, `)`; `00…` → `+…`; без `+` → префикс `+420`; итог должен соответствовать `^\+[1-9]\d{7,14}$` |
| `message` | trim, 1…4000, обязательный |
| `utm` | необязательный JSON только с разрешёнными ключами `utm_*`, каждое значение ≤ 200; невалидный JSON молча отбросить |

## 7. Уведомление (Telegram)

- `POST https://api.telegram.org/bot<TOKEN>/sendMessage`, `parse_mode: "HTML"`, таймаут 5 с (`AbortSignal.timeout`).
- `formatLeadMessage()`:
  - экранирует `& < >` во всех пользовательских полях;
  - обрезает сообщение до 3500 символов (лимит Telegram — 4096);
  - выводит тип заявки, имя, email, телефон (кликабельный `tel:`), текст, utm, время в `Europe/Prague`.
- Если нет `TELEGRAM_BOT_TOKEN` или `TELEGRAM_CHAT_ID` → `console.warn` и выход без ошибки.
- Ошибка или таймаут Telegram → `console.error`. Лид уже сохранён, пользователь видит успех.

## 8. Изменения в `ContactForm.tsx`

Дизайн, классы и тексты не меняются. Добавляется только поведение.

- **Подключение action.** `useActionState(submitLead, { status: "idle" })`, `<form action={formAction}>`, убрать `onSubmit`.
- **Атрибуты полей:**
  - `name` на каждом поле;
  - `required` на email и сообщении;
  - `maxLength` по схеме;
  - `autoComplete`: `given-name`, `family-name`, `email`, `tel`;
  - `inputMode="tel"` у телефона.
- Существующий `<input type="hidden" name="requestType">` переименовать в `name="kind"`.
- **Ловушка React 19.** После завершения action React сбрасывает неуправляемые поля к их `defaultValue`. Поэтому `defaultValue` каждого поля берётся из `state.values`, если он есть. Иначе при ошибке валидации ввод пропадёт. Тумблер `kind` — это React-state, его сброс не затрагивает. При ошибке переключатель восстанавливается из `state.values.kind`.
- **Honeypot.** Поле `website` в обёртке вне экрана (`absolute -left-[9999px]`, `aria-hidden`), с `tabIndex={-1}` и `autoComplete="off"`. Не использовать `display:none`.
- **`startedAt`.** Скрытое поле, значение `Date.now()` выставляется в `useEffect` при монтировании.
- **UTM.** Скрытое поле `utm`: в `useEffect` читать `window.location.search`, собрать `utm_*` в JSON. **Не использовать `useSearchParams`**: без Suspense он ломает статическую генерацию страницы, а её мы планируем вернуть.
- **Состояния:**
  - `pending`: кнопка `disabled`, `aria-busy`, текст «Отправляем…».
  - `success`: вместо полей панель с `role="status"` («Заявка отправлена, ответим в течение рабочего дня») и кнопка «Отправить ещё одну». Кнопка заново монтирует форму через смену `key`.
  - `error` + `fieldErrors`: текст ошибки под полем, `aria-invalid`, `aria-describedby`.
  - `rate_limited` / `server_error`: общий блок с `role="alert"` и ссылкой на телефон `+420 795 402 571` как запасной канал.
- Тексты ошибок — словарь `code → текст` внутри компонента.
- Текст согласия под формой оставить как есть, без изменений.

## 9. Переменные окружения

Все серверные, **без** префикса `NEXT_PUBLIC_`. Добавить в `.env.example` с плейсхолдерами и описать в README.

| Переменная | Назначение |
|---|---|
| `SUPABASE_SECRET_KEY` | Secret key проекта (`sb_secret_…`) или legacy `service_role`. Используется только в `lib/supabase/admin.ts` |
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather |
| `TELEGRAM_CHAT_ID` | Чат или группа для уведомлений |
| `LEAD_IP_SALT` | Случайная строка ≥ 32 символов для хэширования IP |

## 10. Тесты

Добавить `vitest` (devDependency), скрипт `"test": "vitest run"` и alias `@` → `src` в `vitest.config.ts`. Покрыть:

- **schema**:
  - валидная заявка;
  - пустой email или сообщение;
  - превышение длины;
  - `kind` вне списка.
- **`normalizePhone`**:
  - `777 123 456` → `+420777123456`;
  - `00420…` → `+420…`;
  - `+49 30 1234567` без изменений;
  - мусор → ошибка.
- **`formatLeadMessage`**:
  - экранирование `<script>`;
  - обрезка длинного сообщения;
  - время в `Europe/Prague`.
- **utm-парсер**:
  - лишние ключи отбрасываются;
  - невалидный JSON → `null`.

Server Action и сеть unit-тестами не покрываются, их проверяет ручной сценарий из п. 12.

## 11. Ограничения для агента

- Не трогать другие компоненты, калькулятор, Navbar, стили, `tailwind.config.ts`.
- **Не применять миграции к удалённой БД.** Не запускать `supabase db push`, `db reset` и `migration up` для linked-проекта. Миграцию применяет владелец.
- Не коммитить секреты, `.env.local` не трогать.
- Новые зависимости: только `zod`, `server-only`, `vitest`. Любые другие — сначала спросить.
- Коммиты мелкие и осмысленные. Изменения только в файлах из п. 5, плюс `package.json`, `package-lock.json`, `.env.example`, `README.md`, `src/types/database.ts`.
- Юридические тексты (политика, согласия) не писать и не менять.
- Если требование противоречит коду или неоднозначно, остановись и спроси. Не додумывай.

## 12. Критерии приёмки

**Проверяет агент:**

- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` проходят.
- [ ] `lib/supabase/admin.ts` содержит `import "server-only"`. Новые ключи нигде не имеют префикса `NEXT_PUBLIC_`. `grep` по клиентскому бандлу `.next/static` не находит имён `SUPABASE_SECRET_KEY` и `TELEGRAM_BOT_TOKEN`.
- [ ] Без серверных env сборка проходит, а страница рендерится.

**Проверяет владелец после применения миграции и env** (агент включает этот список в отчёт):

- [ ] Валидная заявка → строка в `leads`, сообщение в Telegram, панель успеха.
- [ ] Пустое сообщение или кривой email → ошибка у поля, введённые данные на месте.
- [ ] Honeypot заполнен через DevTools → панель успеха, строки в БД нет.
- [ ] 4-я заявка за 10 минут с одного IP → сообщение `rate_limited` с телефоном.
- [ ] Без `TELEGRAM_*` → лид сохраняется, в логах warning, пользователь видит успех.
- [ ] Запрос к `/rest/v1/leads` с anon key: `select` и `insert` отклоняются.
- [ ] С выключенным JS форма отправляется, заявка доходит.
- [ ] Визуально форма в покое не изменилась.

## 13. Вне скоупа (отдельные задачи)

- Подписка в Footer («The Dispatch · weekly bulletin») — отдельная задача.
- Юридическая часть (политика конфиденциальности, согласия, сроки хранения) — по отдельной команде владельца.
- CAPTCHA / Cloudflare Turnstile — только если honeypot и rate-limit не справятся.
- Автоответ клиенту на email, админка для лидов, i18n.
- Поле телефона с выбором кода страны (сейчас бейдж `+420` статичный; международные номера поддерживаются через ввод `+…`).

## 14. Отчёт агента по завершении

1. Список коммитов и изменённых файлов.
2. Отклонения от задачи и их причины.
3. Шаги для владельца:
   - применить миграцию;
   - заполнить env локально и в Vercel (Production + Preview);
   - создать бота;
   - перегенерировать типы и сверить diff.
4. Чек-лист ручной проверки из п. 12.