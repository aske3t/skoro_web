# CURRENT — архитектура Skoro (skoro-web)

> **Источник правды по архитектуре.** Заменяет [AS-IS.md](AS-IS.md), который остаётся как историческая реконструкция.
> Версия от 2026-10-06. Основа: `chore/foundation` @ `9188c8f` (TASK-002, от `dev` @ `cae9cbe`), пакет архитектора от 2026-10-06.
> Документ меняет только архитектор. Исполнитель предлагает изменения через [PROPOSALS.md](PROPOSALS.md).
> Текущее состояние работ: [../STATE.md](../STATE.md). Текущая задача: [../TASK.md](../TASK.md).

## 1. Система и границы

Skoro — B2B-курьерская служба в Брно (CZ). Веб-приложение — это одновременно маркетинговый сайт и рабочий инструмент клиента. Состоит из:

- лендинга с калькулятором;
- приёма заявок (лиды);
- личного кабинета: заказы, платежи, абонемент.

В плане — оплата онлайн.

Один деплоймент Next.js на Vercel и один проект Supabase. Отдельного бэкенда нет и не планируется. Серверная логика живёт в Server Actions и Route Handlers Next.js, транзакционная — в функциях Postgres.

```mermaid
flowchart LR
  U[Браузер клиента] -->|HTTPS| APP["Next.js 15.5 · Vercel"]
  U -->|publishable key: справочники, вход| SB[(Supabase<br/>Auth + Postgres)]
  APP -->|server client: сессия пользователя, RLS| SB
  APP -->|admin client: secret key, server-only| SB
  APP -->|"after(): уведомление о лиде"| TG[Telegram Bot API]
  U -->|Places Autocomplete| GM[Google Maps JS API]
```

Целевое правило (ADR-0003): браузер **не пишет** в Supabase напрямую. Сейчас исключение одно — создание заказа через RPC из браузера, его уберёт TASK-005.

## 2. Принятые решения

| ADR | Решение | Статус |
|---|---|---|
| [0001](adr/0001-branches-and-deploy.md) | `main` — прод, `dev` — интеграция, `feature/*` → PR в `dev`; деплой только через Git-интеграцию Vercel | принято |
| [0002](adr/0002-schema-as-code.md) | Схема БД, RLS и функции — только миграциями в `supabase/migrations/`; baseline делается в TASK-002 | принято |
| [0003](adr/0003-server-write-path.md) | Все записи идут через Server Actions / Route Handlers; три Supabase-клиента со строгими ролями | принято |
| [0004](adr/0004-pricing-single-source.md) | Тарифы хранятся в БД, формула — в одном TS-модуле `lib/pricing`, авторитетная цена считается на сервере | принято, модель данных — после baseline |

**Сквозные правила** (кратко, подробности в ADR):

- **Валидация** — zod, только на сервере. zod не попадает в клиентский бандл: клиентские константы лежат в отдельном `constants.ts`.
- **Ошибки** возвращаются кодами, тексты для пользователя живут в UI. Это задел под i18n.
- **Env** читаются лениво, в момент вызова. Отсутствие серверного ключа ломает фичу, а не рендер страницы или сборку. Серверные ключи — без `NEXT_PUBLIC_`.
- **Бизнес-время** — таймзона `Europe/Prague`, считается на сервере. Таймзона браузера в бизнес-логике не используется.
- **Побочные эффекты** (уведомления, письма) выполняются через `after()` и не влияют на результат основной операции.
- **Юридические тексты** (политика, согласия, оферта) исполнитель пишет и меняет только по прямой команде владельца.

## 3. Слои и модули

| Слой | Где | Правило |
|---|---|---|
| Маршруты | `src/app/**` | RSC по умолчанию. `"use client"` — только для интерактива |
| UI | `src/components/**` | Не ходит в БД сам. Получает данные пропсами или вызывает action |
| Домен | `src/lib/<domain>/` | Чистые функции и actions домена. Зависимости направлены вниз: UI → domain → infra |
| Инфраструктура | `src/lib/supabase/*`, `src/lib/maps/*` | Фабрики клиентов, внешние SDK |
| Типы БД | `src/types/database.ts` | Только генерация (`supabase gen types`), руками не правится |

**Эталон доменного модуля — `src/lib/leads/` (TASK-001).** Новые домены (`pricing`, `orders`, `payments`) строятся по той же схеме:

```
lib/<domain>/
  constants.ts   client-safe константы и типы (без zod)
  schema.ts      zod-схемы, нормализация; server-side
  actions.ts     "use server"; тонкий оркестратор: validate → authorize → persist → after()
  *.ts           чистая логика и доступ к данным
  *.test.ts      vitest на чистые функции
```

**Supabase-клиенты** (ADR-0003):

| Клиент | Ключ | Где разрешён | Назначение |
|---|---|---|---|
| `lib/supabase/client.ts` | publishable (anon) | client components | Публичные справочники, вход и выход |
| `lib/supabase/server.ts` | publishable + cookie-сессия | RSC, actions, route handlers | Всё от имени пользователя, RLS действует |
| `lib/supabase/admin.ts` | secret, `server-only` | actions, route handlers | Системные записи без пользователя (лиды, вебхуки) и внутренние функции **после** явной проверки прав в коде |

## 4. Маршруты

| Путь | Сейчас | План |
|---|---|---|
| `/` | работает; `ƒ` dynamic из-за `Navbar` в корневом layout | `○` static, данные цен через ISR (TASK-003, TASK-004) |
| `/login` | работает | — |
| `/dashboard`, `/orders`, `/payments` | работает; защита в `dashboard/layout.tsx` | — |
| `/dashboard/orders/new` | **падает**: `service_config` не читается (P-14); RPC из браузера, слот по таймзоне браузера | доступ — TASK-003; Server Action, Europe/Prague — TASK-005 |
| `/dashboard/subscribition` | работает, опечатка в URL | `/subscription` + редирект со старого (TASK-003) |
| `/auth/callback` | не используется; `next` не проверяется | при возврате регистрации или magic-link принимать только пути с одиночным `/` |
| `/auth/signout` | работает | — |
| `/api/geocode/search` | удалён (TASK-002) | — |
| `/personal` | 404, ссылка в Navbar | убрать ссылку: сейчас только B2B (TASK-003) |
| `/tracking` | 404, форма в HeroTracking | форма заменяется CTA на калькулятор и заявку (TASK-003); трекинг — бэклог |

`middleware.ts` сейчас вызывает `getUser()` на **каждом** запросе, включая лендинг. Целевой matcher (TASK-003): `/dashboard/:path*`, `/login`, `/auth/:path*`.

## 5. Данные

Источник истины — миграции (ADR-0002): baseline `20261005224233_remote_schema.sql` и всё, что после. Фактический доступ и находки аудита — [db-security.md](db-security.md). Расхождения с целевой матрицей закрываются по частям: grants и политики — TASK-003; функция заказа, defaults, FK и `check` — TASK-005 и TASK-006.

| Таблица | Назначение |
|---|---|
| `zones`, `zone_distances` | Зоны Брно и матрица расстояний |
| `delivery_slots` | Слоты срочности: цена, запас времени |
| `skoro_pricing` | Базовые ставки (одна строка) |
| `service_config` | Рабочие часы (одна строка) |
| `retail_points` | Данные для режима compare калькулятора |
| `orders`, `payments`, `subscriptions` | Заказы, платежи, абонементы клиента |
| `profiles` | Компания клиента; в UI пока не используется |
| `leads` | Заявки с контактной формы (TASK-001); RLS без политик, права anon и authenticated отозваны |

**Целевая матрица доступа.** Отклонения фиксирует аудит в TASK-002, исправления делаются отдельными миграциями.

| Таблицы | anon | authenticated | Запись |
|---|---|---|---|
| `zones`, `zone_distances`, `delivery_slots`, `skoro_pricing`, `service_config`, `retail_points` | select | select | только миграции и сид |
| `orders`, `payments`, `subscriptions` | — | select **своих** строк | только сервер |
| `profiles` | — | select своей строки | только сервер |
| `leads` | — | — | только сервер (admin) |

Функции с `security definer` обязаны иметь `set search_path = ''`, а `execute` у них отозван для `public`, `anon` и `authenticated`, если прямой вызов из клиента не предусмотрен явно.

## 6. Ключевые потоки

**Лид (эталон, TASK-001).**

1. `ContactForm` вызывает `submitLead` (Server Action).
2. Проверки: honeypot и time-trap → zod → rate-limit по `ip_hash` (через БД).
3. Insert через admin-клиент.
4. `after()` отправляет уведомление в Telegram.

Сбой уведомления лид не теряет. Форма работает и без JS.

**Калькулятор (сейчас).** Справочники читаются из браузера с publishable key. Адрес выбирается через Google Places, зона определяется по ближайшему центру, цена считается на клиенте. После TASK-004 расчёт идёт через `lib/pricing` на данных из БД. На клиенте остаётся только превью.

**Создание заказа.**
- **Сейчас.** `pickSlot()` в браузере → `supabase.rpc('create_order_for_user')` из браузера. Цену и списание абонемента делает RPC; код станет виден после baseline.
- **Цель (TASK-005).**
  1. Server Action: `getUser()` → zod → слот по `Europe/Prague` → цена через `lib/pricing`.
  2. Внутренняя SQL-функция атомарно вставляет заказ и списывает абонемент. Вызывается admin-клиентом, `execute` закрыт для клиентов.
  3. В заказе сохраняется снимок цены: сумма, разбивка, версия тарифа.

**Оплата (цель, TASK-006).** Сумма считается только на сервере. Статус оплаты меняет только вебхук провайдера (Route Handler + admin-клиент + проверка подписи). Провайдер выбирается в TASK-006. Перед этой задачей заводится отдельный staging-проект Supabase (ADR-0002).

## 7. Интеграции

| Система | Назначение | Конфиг | Статус |
|---|---|---|---|
| Supabase | Auth, Postgres | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable), `SUPABASE_SECRET_KEY` | используется |
| Google Maps Places | Ввод адресов в калькуляторе; **единственный геокодер** (P-09) | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — обязательно ограничить по HTTP referrer | используется |
| Telegram Bot API | Уведомления о лидах | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | TASK-001 |
| Антиспам лидов | Хэширование IP | `LEAD_IP_SALT` | TASK-001 |
| Nominatim | — | — | удалён (TASK-002) |
| Google Fonts | `next/font` | — | у Space Grotesk нет кириллицы (бэклог, дизайн) |

## 8. Платформа и окружения

| Что | Решение |
|---|---|
| Node | 22 LTS: `engines >=22.12`, `.nvmrc` = `22`, Vercel 22.x. Node 22 EOL 2027-04-30 → переход на 24 LTS до этой даты (бэклог) |
| Next.js | 15.5.x с актуальными патчами (на 2026-10-02 — 15.5.27). Next 16 — отдельная задача миграции (бэклог), не смешивать с фичами |
| Ветки и деплой | ADR-0001 |
| Supabase | Один проект до TASK-006. Перед оплатой — отдельный staging-проект (ADR-0002) |
| Качество | `tsc --noEmit`, `eslint .`, `vitest`, `next build` в CI на каждый PR (TASK-002) |
| Supabase CLI | Из сети владельца `--linked` не работает (новый формат ключей, нет IPv6), поэтому все команды идут с `--db-url` (Session pooler). Миграции применяются так: `npx supabase db push --db-url "$DB_URL"` |
| `npm audit` | Остаток — 6 high и 1 moderate, все в зависимостях сборки: Tailwind 3 → `chokidar`/`micromatch`, `postcss` внутри `next`. Риск принят. Закроется миграциями на Tailwind 4 и Next 16 (бэклог) |

## 9. Известные проблемы и где они решаются

| Проблема | Где |
|---|---|
| `service_config` без политики чтения → форма заказа падает (P-14) | TASK-003 |
| У `anon`/`authenticated` полные grants на запись, политики `to public`, RPC заказа доступна `anon` (P-20, P-16 частично) | TASK-003 |
| Старый `@supabase/ssr`, клиенты без `<Database>` (P-13) | TASK-003 |
| Лендинг dynamic, middleware на каждом запросе, `/personal`, опечатка `subscribition`, нерабочая форма трекинга | TASK-003 |
| Цены в трёх местах; цена заказа в RPC = `base_price` слота (P-15); `zone_distances` пуста — калькулятор считает 0 км (P-18); монолитный `Calculator.tsx` | TASK-004 |
| RPC: слот не сверяется со временем, `valid_until` абонемента не проверяется (P-15); `search_path`, `execute` (P-16); `pickSlot` по таймзоне браузера; `serviceRes.data!`; `.maybeSingle()` при двух активных абонементах | TASK-005 |
| `orders.payment_status` default `'paid'`, `on delete cascade` от `auth.users`, нет `check` на статусы и `remaining_deliveries >= 0` (P-19, P-20) | TASK-005 (заказы), TASK-006 (`payments`) |
| `profiles` не создаётся при создании аккаунта (P-21) | онбординг B2B (бэклог) |
| `<html lang="en">`, метаданные «40+ cities», хардкод Брно в трёх местах | бэклог (контент, i18n, расширение географии) |

## 10. Дорожная карта

- ✅ **TASK-001** — контактная форма → лиды.
- ✅ **TASK-002** — фундамент: baseline схемы, аудит доступа, Node и патчи, ESLint и CI, гигиена.
1. **TASK-003 — доступ к БД, статический лендинг, навигация.** Срочный фикс `service_config` и grants, обновление `@supabase/ssr` и типизация клиентов, статичный `/`, `/personal`, `/subscription`, CTA вместо трекинга, ветка `main`.
2. **TASK-004 — единый источник цен** (ADR-0004), включая матрицу `zone_distances`.
3. **TASK-005 — создание заказа на сервере** (ADR-0003), включая проверки RPC и финансовые defaults.
4. **TASK-006 — гейт оплаты.** Staging, выбор провайдера, вебхуки, defaults `payments`.

**Бэклог:**
- подписка в Footer (по паттерну leads);
- регистрация и онбординг B2B, включая создание `profiles` (P-21);
- трекинг заказов: после TASK-005, когда у заказа есть статусы и публичный код;
- миграция на Next 16 и Tailwind 4 (закроют остаток `npm audit`);
- Node 24;
- i18n (cs/en/ru);
- шрифт с кириллицей.

## 11. Журнал решений по PROPOSALS (2026-10-02)

| # | Решение |
|---|---|
| P-01 | ADR-0001. `main` создаётся от `ec05ede` (это содержимое живого сайта, проверено архитектором), тег `prod-2026-05-17`. `master` и `variant1` удаляются после переключения Vercel |
| P-02 | ADR-0002. Baseline в TASK-002: `link` → `migration repair` (leads) → `db pull`. Staging — перед TASK-006 |
| P-03 | Node 22 LTS в трёх местах (TASK-002); переход на 24 — до 2027-04 |
| P-04 | Остаёмся на 15.5.x: откат незакоммиченного Next 16, `npm audit fix` без `--force`. Next 16 — бэклог |
| P-05 | ADR-0003. Все записи через сервер; `createOrder` → Server Action (TASK-005) |
| P-06 | Navbar статичный; статус входа — клиентский островок на browser-клиенте (UI-индикация, не защита). Защита остаётся в `dashboard/layout.tsx`. Matcher middleware сужается. TASK-003 |
| P-07 | ADR-0004 |
| P-08 | Сейчас только B2B. Аккаунты создаёт владелец в Supabase до задачи онбординга. Ссылку `/personal` убрать (TASK-003). **Трекинг — ждёт решения владельца** |
| P-09 | Google Places — единственный геокодер; Nominatim удалить (TASK-002) |
| P-10 | Вместо абсолютной метки — длительность заполнения по часам клиента: `elapsedMs` = submit − mount, оба значения на одном устройстве. HMAC не нужен, со статическим лендингом совместимо (TASK-002) |
| P-11 | ESLint 9 (flat config, `eslint-config-next` 15.5.x), скрипт `eslint .` (`next lint` устарел); GitHub Actions на PR (TASK-002) |
| P-12 | Принято целиком (TASK-002) |

## 12. Журнал решений по PROPOSALS (2026-10-06)

| # | Решение |
|---|---|
| P-08 | Форма трекинга в Hero заменяется двумя CTA: «Рассчитать стоимость» → калькулятор, «Оставить заявку» → контактная форма (TASK-003). Сам трекинг — бэклог после TASK-005 |
| P-13 | В TASK-003: `@supabase/ssr` ^0.12.7 + актуальная `supabase-js` 2.x, `<Database>` на всех клиентах, `p_comment: undefined` вместо `null`. TASK-003 всё равно переписывает работу с сессией в Navbar и middleware |
| P-14 | 🔴 Первый блок TASK-003: политика чтения `service_config` для `anon` и `authenticated` + защита страницы от отсутствия строки |
| P-15 | Подтверждено: цена — TASK-004; проверка слота по времени и `valid_until` — TASK-005 |
| P-16 | TASK-005. `execute` у `public` и `anon` отзывается уже в TASK-003: это бесплатно и закрывает анонимный вызов |
| P-17 | `pg_net` не нужен: внешние вызовы и вебхуки идут через Route Handlers (ADR-0003). Строка `drop extension` в baseline отражает реальность — на удалённой БД расширения нет, оно есть только в образе для diff. Baseline не трогаем. Закрыто |
| P-18 | TASK-004: матрица заполняется вместе с переносом тарифов в БД. В TASK-003 только диагностика `count(*)` |
| P-19 | `orders`: default `'pending_payment'` (значение, которое уже пишет RPC) + `check` по списку статусов, FK на `auth.users` → `restrict` — TASK-005. `payments` — TASK-006 |
| P-20 | Grants и политики — TASK-003: запись у `anon` и `authenticated` отзывается на всех таблицах `public`, включая default privileges, политики получают явные роли. `check`-ограничения — TASK-005 |
| P-21 | Бэклог, задача онбординга B2B |
| — | Остаток `npm audit` принят (§8) |
| — | Supabase CLI работает через `--db-url` (§8) |
