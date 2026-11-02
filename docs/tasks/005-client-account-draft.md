> ⏸ **ОТЛОЖЕНА 2026-11-02.** Не выполнять. Модель данных и путь заказа заменены ADR-0006 (опции клиента, тарифы, формы, заказы через Telegram). После пилота бота задача будет переписана: веб-кабинет как второй канал тех же опций и форм, вход по приглашению, политики чтения, абонементы.

# TASK-005: личный кабинет v1

> Архитектура: [architecture/CURRENT.md](architecture/CURRENT.md) (версия 2026-10-31, решения — §13).
> **Главное:** [ADR-0005](architecture/adr/0005-client-account.md) (модель, доступ, путь заказа), [ADR-0004, уточнение 2026-10-31](architecture/adr/0004-pricing-single-source.md) (`resolveClientPrice`), [ADR-0002, дополнение 2026-10-31](architecture/adr/0002-schema-as-code.md) (миграции совместимы с `main`), ADR-0003.
> Базовая ветка: `dev`. Рабочая ветка: `feature/client-account`, запушить сразу.
> Решения зафиксированы. Если какое-то мешает, остановись и опиши проблему в PROPOSALS, не меняй его самостоятельно.

## 1. Зачем

Сейчас кабинет:
- **создаёт заказ, о котором никто не узнаёт**: RPC из браузера, без уведомления;
- **выбирает слот по часам браузера**;
- **не знает о компаниях, точках и индивидуальных ценах** — всё привязано к одному пользователю;
- **не умеет приглашать клиентов**: встроенная почта Supabase не шлёт клиентам;
- **вход на английском и зависает при ошибке** (P-26).

После задачи:
- владелец заводит клиента с точками и ценами и приглашает его по email;
- клиент сам задаёт пароль и оформляет заказ;
- заказ приходит в Telegram с кнопками «Принять / Отклонить / Доставлен»;
- клиент видит статус в кабинете, получает письмо о принятии и может отменить заказ, пока его не приняли.

Блоки выполнять по порядку. Каждый блок — свои коммиты. Остановки для владельца отмечены **⏸**.

## 2. Блок 0 — диагностика (только `select`)

```sql
select version();
select payment_status, count(*) from public.orders group by 1;
select status, count(*) from public.subscriptions group by 1;
select count(*) from public.subscriptions where remaining_deliveries < 0;
select user_id, count(*) from public.subscriptions where status = 'active' group by 1 having count(*) > 1;
select count(*) from public.profiles;
select count(*) from public.orders;
```

Результаты — в отчёт. От них зависит миграция:
- PostgreSQL ≥ 15 → `unique nulls not distinct`; иначе — два частичных уникальных индекса;
- значения `payment_status` → список в `check`;
- отрицательный `remaining_deliveries` → `check` не добавлять, сообщить владельцу.

## 3. Блок 1 — миграция `supabase/migrations/<ts>_client_accounts.sql`

Только расширение (ADR-0002, дополнение). Полные имена объектов (`public.…`).

### 3.1. Клиенты, точки, цены

| Таблица | Колонки и ограничения |
|---|---|
| `clients` | `id` uuid pk · `type` text `check in ('company','person')` · `name` text not null ≤ 300 · `ico` text null `^[0-9]{8}$` · `check (type <> 'company' or ico is not null)` · `email` ≤ 254 null · `phone` ≤ 20 null · `payment_method` text not null default `'invoice'` `check in ('invoice','cash')` · `active` bool not null default true · `notes` text null · `created_at` |
| `client_locations` | `id` uuid pk · `client_id` → `clients` on delete cascade · `name` not null ≤ 100 · `address` not null ≤ 300 · `lat`, `lng` double null · `contact_phone` ≤ 20 null · `active` bool default true · `display_order` int default 0 · `created_at` · `unique (id, client_id)` |
| `client_prices` | `id` uuid pk · `client_id` → `clients` on delete cascade · `location_id` uuid null · `foreign key (location_id, client_id) references client_locations (id, client_id) on delete cascade` (точка обязана принадлежать клиенту) · `slot_id` → `delivery_slots` on delete restrict · `price` int not null `check (price >= 0)` · `unique nulls not distinct (client_id, location_id, slot_id)` |

- **`profiles`:** колонка `client_id uuid null` → `clients` on delete set null, плюс индекс.
- **`public.current_client_id()`:**
  - `returns uuid`, `language sql stable security definer set search_path = ''`;
  - тело: `select client_id from public.profiles where id = auth.uid()`;
  - права: `revoke` у `public`, `anon`; `grant execute` у `authenticated`.
- **RLS на трёх новых таблицах:**
  - включить RLS, `revoke all` у `anon` и `authenticated`, затем `grant select to authenticated`;
  - политики `for select to authenticated` по условию `client_id = public.current_client_id()` (у `clients` — `id = …`).

### 3.2. Заказы, абонементы, платежи

**`orders` — новые колонки, все nullable:**

| Колонка | Тип и ограничения |
|---|---|
| `client_id` | → `clients` on delete restrict |
| `location_id` | → `client_locations` on delete set null |
| `number` | bigint, default из новой последовательности `orders_number_seq`, `unique`, со сквозной нумерацией старых строк — как `leads.number`, миграция `20261020235139` |
| `recipient_name` | ≤ 100 |
| `recipient_phone` | ≤ 20 |
| `contact_email` | ≤ 254 |
| `payment_method` | `check in ('invoice','cash','online')` |
| `price_source` | `check in ('subscription','location','client','slot')` |
| `accepted_at`, `cancelled_at` | timestamptz |
| `cancelled_by` | `check in ('client','admin')` |
| `handled_by_tg_id` | bigint |
| `handled_by_name` | ≤ 200 |
| `tg_chat_id`, `tg_message_id` | bigint |
| `client_notified_at` | timestamptz |

Плюс индекс `(client_id, created_at desc)`.

**`orders` — изменения существующего (P-19):**
- default `payment_status` → `'pending_payment'`;
- `check (payment_status in (…значения из Блока 0…))`: `not valid`, затем `validate`;
- `orders_user_id_fkey`: `on delete cascade` → `on delete restrict`.

**`subscriptions`:**
- `client_id` → `clients` on delete restrict;
- `check (remaining_deliveries >= 0)` (если Блок 0 позволил);
- `subscriptions_user_id_fkey` → `restrict`;
- частичный уникальный индекс `(client_id) where status = 'active' and client_id is not null` — у клиента не больше одного активного абонемента.

**`payments`:** `client_id` → `clients` on delete restrict. Внешний ключ и defaults `payments` — TASK-006.

**Новые политики** `for select to authenticated using (client_id = public.current_client_id())` на `orders`, `subscriptions`, `payments`. Старые политики «own …» не трогать.

### 3.3. Функция `public.create_client_order(...)`

**Параметры:** `p_client_id`, `p_user_id`, `p_location_id`, `p_from_address`, `p_to_address`, `p_slot_id`, `p_scheduled_for timestamptz`, `p_recipient_name`, `p_recipient_phone`, `p_contact_email`, `p_comment`, `p_payment_method`, `p_price integer`, `p_price_source`. Возвращает `public.orders`.

**Объявление:** `security definer`, `set search_path = ''`.

**Права:** `revoke execute` у `public`, `anon`, `authenticated`; `grant execute to service_role`.

**Проверки.** Каждая бросает исключение с фиксированным текстом-кодом, сервер сопоставляет его с кодами ошибок:
- клиент активен (`client_inactive`);
- `profiles.client_id` пользователя равен `p_client_id` (`client_mismatch`);
- точка, если передана, принадлежит клиенту (`location_mismatch`);
- слот существует (`invalid_slot`).

**Абонемент:**
- найти: `client_id = p_client_id and status = 'active' and remaining_deliveries > 0 and (valid_until is null or valid_until > now())`, порядок `purchased_at desc`, `limit 1 for update`;
- **если найден:** списать одну доставку; заказ получает `price = 0`, `price_source = 'subscription'`, `payment_status = 'paid'`, `subscription_id`;
- **иначе:** `price = p_price`, `price_source = p_price_source`, `payment_status = 'pending_payment'`.

**Остальное:** `status = 'new'`, `user_id = p_user_id`. Старый `recipient_contact` = имя и телефон одной строкой — для совместимости с отображением в `main`.

### 3.4. Совместимость с `main` и применение

- Для каждого изменённого существующего объекта (`orders.payment_status`, три FK, политики, `profiles`) выполни `git grep -n … origin/main -- src` и запиши в отчёт, почему изменение не ломает `main`. В частности: RPC `create_order_for_user` из `main` пишет `payment_status` явно, `order_status` не меняется.
- **⏸ Миграцию применяет владелец:** `npx supabase db push --db-url "$DB_URL"`.
- Затем:
  - `migration list` синхронен;
  - `db diff` пуст;
  - типы перегенерированы, ручная правка `newsletter_subscribers` в `database.ts` сверена.

## 4. Блок 2 — вход и доступ (ADR-0005 §2)

1. **`src/lib/auth/next-path.ts` — `safeNextPath(raw, fallback = "/dashboard")`.**
   - Принимает только путь, который начинается с одиночного `/`. `//`, `\`, `/\`, схемы и пустое значение отбрасываются.
   - Тесты.
   - Применить в `/auth/callback` и в новом `/auth/confirm`.
2. **`src/app/auth/confirm/route.ts`** (GET):
   - параметры `token_hash`, `type ∈ {invite, recovery, email}`, `next`;
   - `verifyOtp` через server-клиент;
   - успех → `safeNextPath(next)`, иначе → `/login?error=link_invalid`.
3. **`/dashboard/password`** — страница и Server Action `updatePassword`.
   - Поля: пароль 8–72 символа и подтверждение.
   - Коды ошибок: `too_short`, `mismatch`, `weak` (ответ Supabase о слабом пароле), `server_error`. Успех → `/dashboard`.
   - Страница работает и у пользователя без клиента.
4. **`/login`:**
   - тексты на русском;
   - `LoginForm` — `try / catch / finally`, ошибки кодами (`invalid_credentials`, `network`, `not_configured`) с русскими текстами (P-26);
   - сообщение для `?error=link_invalid`;
   - ссылка «Забыли пароль?» → `/login/reset`.
5. **`/login/reset`:**
   - email → Server Action `requestPasswordReset` → `resetPasswordForEmail`;
   - ответ всегда один: «Если аккаунт с этим адресом есть, мы отправили письмо со ссылкой».
6. **Middleware (P-22):** заголовки из второго аргумента `setAll` ставятся на ответ.
7. **P-24:** без `NEXT_PUBLIC_SUPABASE_*` layout кабинета показывает «Кабинет временно недоступен» с телефоном `+420 795 402 571`, а не 500. `server.ts` не бросает до проверки — нужен хелпер `isSupabaseConfigured()`.
8. **`docs/ops/auth-setup.md`** — пошаговая инструкция для владельца.
   - Supabase → Authentication:
     - **SMTP Settings:** свой SMTP — `smtp.resend.com`, порт 465, пользователь `resend`, пароль — отдельный ключ Resend с правом отправки, отправитель `noreply@notify.skorouvas.cz`, имя `SKORO u vás`;
     - **Rate Limits:** письма — 30 в час;
     - **URL Configuration:** Site URL `https://skorouvas.cz`; Redirect URLs — прод, `http://localhost:3000/**`. Для теста до релиза Site URL временно ставится `http://localhost:3000`: ссылки из писем ведут на Site URL, а `/auth/confirm` до релиза есть только в новой ветке. Перед приглашением реальных клиентов Site URL возвращается на прод;
     - **Email Templates:** «Invite user» — `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/dashboard/password`; «Reset password» — то же с `type=recovery`. Короткий текст писем на русском и чешском — черновик для утверждения владельцем;
     - **Sign In / Providers:** выключить «Allow new users to sign up».
   - **⏸ Владелец настраивает по инструкции.**

## 5. Блок 3 — домен заказов

1. **`src/lib/orders/prague-time.ts`:**
   - `pragueLocalToInstant("YYYY-MM-DDTHH:mm")` — время из `datetime-local` как пражское → `Date`. Несуществующее время при переводе часов → код `invalid_time`; неоднозначное → более раннее;
   - `pragueMinuteOfDay(date)`;
   - только `Intl`, без зависимостей;
   - тесты, включая 2026-03-29 и 2026-10-25.
2. **`src/lib/orders/slot.ts` — `pickSlot`** по пражским минутам. Переносит логику из `lib/calculator/slotpicker.ts`, старый файл удалить.
   - Результат: `ok` / `past` / `outside_hours`.
   - Тесты: каждая граница `max_lead_minutes`, начало и конец рабочих часов.
3. **`src/lib/pricing/client.ts` — `resolveClientPrice`** (ADR-0004, уточнение, п. 2).
   - Тесты: цена точки важнее цены клиента, цена клиента важнее слота, запасной вариант — слот, неизвестный слот → код ошибки.
4. **`src/lib/orders/schema.ts`** (zod, коды ошибок полей):
   - `routeMode` (`single` / `multi`);
   - точка забора: ровно одно из `locationId` (uuid) или `pickupAddress`;
   - `deliveryAddress`;
   - `recipientName` (необязательно, ≤ 100);
   - `recipientPhone` — обязательно, через `composePhone` из `leads/phone-format.ts`;
   - `scheduledAt`;
   - `comment` ≤ 1000;
   - фото — те же правила, что в `leads/photo.ts`.
   - Тесты.
5. **`src/lib/orders/queries.ts`** — server-клиент, RLS:
   - `getAccountContext()` → `{ user, profile, client | null }`;
   - активные заказы и история клиента;
   - заказ по id;
   - данные формы: точки, цены, слоты, `service_config`, активный абонемент клиента.
6. **`src/lib/orders/actions.ts`:**
   - **`createOrder`:**
     - шаги: пользователь → клиент → zod → `multi` → `multi_route_unavailable` → время → слот → цена → `create_client_order` через admin-клиент → `after()` (Блок 4) → редирект на `/dashboard/orders/<id>?created=1`;
     - коды: `unauthorized`, `no_client`, `client_inactive`, `validation` (+ `fieldErrors`), `invalid_time`, `slot_past`, `slot_outside_hours`, `server_error`;
     - при ошибке введённые значения возвращаются (урок TASK-001: `defaultValue` из `state.values`).
   - **`cancelOrder(orderId)`:**
     - проверка, что заказ принадлежит клиенту пользователя;
     - условный `update … set status = 'cancelled', cancelled_at = now(), cancelled_by = 'client' where id = … and client_id = … and status = 'new'` через admin-клиент;
     - `after()` правит сообщение в Telegram;
     - коды: `not_found`, `not_cancellable`.
7. **Удалить** `src/lib/account/createOrder.ts` и `getActiveSubscription` по `user_id`. Типы `Order` и др. перенести в `lib/orders`.

## 6. Блок 4 — Telegram и письмо

1. **`callback-data.ts`:**
   - плюс вид `order:<accept|decline|deliver|cancel|email>:<uuid>` (≤ 64 байт);
   - разбор обоих видов, тесты;
   - один обработчик `callback_query:data` раскладывает по видам; поведение кнопок заявок не меняется.
2. **`formatOrderMessage(order, context, note?)`** — HTML с экранированием:
   - «Заказ №N»;
   - клиент: название, IČO; точка или адрес;
   - откуда → куда;
   - время (Europe/Prague) и слот;
   - цена и источник: «по абонементу», «индивидуальный тариф», «базовый тариф»;
   - оплата;
   - получатель;
   - комментарий;
   - кто оформил (email);
   - строка-заметка.

   Тесты.
3. **Отправка после создания:**
   - в `TELEGRAM_CHAT_ID`, кнопки `[✅ Принять] [❌ Отклонить]`;
   - `tg_chat_id` и `tg_message_id` сохраняются в заказ;
   - фото — ответом на сообщение;
   - функция никогда не бросает.
4. **Кнопки** — только админы (`isAdminFromEnv`). Все переходы условные (ADR-0005 §4):

   | Кнопка | Переход | Дальше |
   |---|---|---|
   | `accept` | `new → in_progress`, `accepted_at`, кто нажал | письмо → кнопки `[📦 Доставлен] [❌ Отменить]` (+ «📧 Повторить письмо», если письмо не ушло) |
   | `decline` | `new → cancelled`, `cancelled_by = 'admin'` | кнопки убираются |
   | `deliver` | `in_progress → delivered`, `delivered_at` | кнопки убираются |
   | `cancel` | `in_progress → cancelled`, `cancelled_by = 'admin'` | кнопки убираются |
   | `email` | — | повтор письма по правилу P-30 |

   - Повтор нажатия или гонка → всплывающее «Заказ уже обработан: …».
   - Сообщение каждый раз пересобирается из БД.
5. **Письмо «Заказ №N принят»** — `src/lib/email/order-accepted.ts`:
   - по образцу `lead-taken.ts`, тот же язык (P-29), на `contact_email`;
   - факт отправки — `client_notified_at`, `Idempotency-Key`;
   - тесты.
6. **Отмена клиентом** правит сообщение: заметка «❌ Отменён клиентом · время», кнопки убираются. Сбой правки только логируется.
7. Обновить `docs/telegram-bot.md`.

## 7. Блок 5 — страницы кабинета

Стиль — токены сайта, без отдельного редизайна. Ширины 390 / 1024 / 1440 px. Тексты на русском, в компонентах.

1. **Layout:**
   - в шапке название клиента (или email) и email пользователя мелко;
   - вкладки «Обзор / Заказы / Абонемент / Платежи / Профиль», «Выйти»;
   - нет клиента → на всех страницах, кроме `/dashboard/password`, блок «Аккаунт ещё не подключён к компании — свяжитесь с нами» с телефоном.
2. **Обзор:** абонемент (остаток, срок), три последних активных заказа, кнопка «Новый заказ».
3. **Заказы:**
   - переключатель «Активные / История»;
   - в карточке: номер, статус (метки ADR-0005 §4), откуда → куда, время по Праге, цена и источник;
   - карточка — ссылка на заказ.
4. **`/dashboard/orders/[id]`:**
   - все поля заказа;
   - хронология: создан → принят → доставлен или отменён, с временем;
   - «Отменить» — только при `new`, с подтверждением;
   - «Повторить заказ» → `/dashboard/orders/new?repeat=<id>`;
   - чужой или несуществующий заказ → `notFound()`;
   - баннер «Заказ создан», если в адресе `?created=1`.
5. **`/dashboard/orders/new`:**
   - **переключатель** «Одна доставка / Маршрут». «Маршрут» показывает заглушку: «Скоро: несколько заборов и доставок в одном заказе. Пока оформите отдельные заказы или напишите нам» + контакт. Отправка недоступна;
   - **Откуда:** выбор из активных точек клиента (название и адрес) или «Другой адрес» → `AddressInput`;
   - **Куда:** `AddressInput`;
   - **Получатель:** имя (необязательно) и `PhoneInput` (обязательно);
   - **Когда:** `datetime-local`. Под ним — слот и превью цены теми же чистыми функциями: «180 Kč · индивидуальный тариф» или «Спишется с абонемента «…», останется N». Ошибки «время прошло» и «вне рабочих часов» — с часами из `service_config`;
   - **Комментарий, фото** (`PhotoField`);
   - **Оплата** — строка только для чтения: «По абонементу», «По счёту» или «Наличными курьеру»;
   - **повтор** — поля из исходного заказа, кроме времени;
   - `AddressInput`, `PhoneInput` и `PhotoField` переиспользуются через пропсы и классы. Их логику не копировать и не менять.
6. **Абонемент** — абонемент клиента: тариф, остаток / всего, срок. Нет → «Абонемента нет» и ссылка на `/#abons`.
7. **Платежи** — как сейчас, по клиенту.
8. **Профиль:**
   - клиент: тип, название, IČO, способ оплаты;
   - точки: название, адрес;
   - email пользователя и ссылка «Сменить пароль»;
   - текст «Изменить данные — напишите нам» с контактом.

## 8. Блок 6 — инструкция для владельца `docs/ops/clients.md`

SQL-сниппеты для SQL Editor, с местами для подстановки и пояснениями:
1. создать клиента — компания или частное лицо;
2. добавить точку;
3. задать цены: для точки × слота, для клиента × слота;
4. пригласить пользователя — Dashboard → Invite user (ссылка на `auth-setup.md`);
5. привязать пользователя к клиенту: строка `profiles` по email из `auth.users`;
6. выдать абонемент клиенту;
7. проверочный `select`: что клиент видит.

**⏸ Владелец по инструкции заводит тестового клиента** — две точки, индивидуальная цена для одной точки и одного слота, два пользователя. Агент проверяет результат `select`-ами.

## 9. Ограничения

- **БД:** только миграция Блока 1. Применяет владелец. Не менять `create_order_for_user`, значения `order_status`, старые политики «own …».
- **Не трогать:**
  - лендинг, калькулятор, форму заявки (компоненты только переиспользовать);
  - логику кнопок заявок, кроме общего разбора `callback_data` без изменения поведения;
  - публичные тарифы.
- **Новые зависимости не нужны.**
- **Юридические тексты не писать.** Тексты писем Auth и письма о принятии — черновики для утверждения владельцем.
- **Маршрут** — только заглушка интерфейса и код ошибки на сервере.

## 10. Критерии приёмки

**Агент:**
- [ ] `tsc`, `lint` (0 / 0), `test`, `build` проходят; CI на PR зелёный.
- [ ] Тесты: пражское время с DST, `pickSlot`, `resolveClientPrice`, `safeNextPath`, схема заказа, `callback_data` обоих видов, `formatOrderMessage`, письмо о принятии.
- [ ] `grep -rn "create_order_for_user\|account/createOrder\|calculator/slotpicker" src` — только в `src/types/database.ts`.
- [ ] Совместимость миграции с `origin/main` описана (п. 3.4).
- [ ] Предложение contract-шага записано в PROPOSALS: `revoke` / `drop` `create_order_for_user`, удаление старых политик «own …», `not null` на `orders.client_id`, FK `payments` — в TASK-006.

**Владелец** — локально или на Preview, после миграции, настройки Auth и тестового клиента:
- [ ] **Приглашение:** письмо приходит с `notify.skorouvas.cz`, ссылка → установка пароля → кабинет с названием клиента.
- [ ] **Сброс пароля:** работает. Для несуществующего email ответ тот же.
- [ ] **Пользователи:** второй пользователь клиента видит те же заказы и абонемент; пользователь без клиента видит «не подключён».
- [ ] **Цена:**
  - точка и слот с индивидуальной ценой → эта цена, «индивидуальный тариф»;
  - слот без неё → цена слота;
  - с активным абонементом → «по абонементу», остаток −1.
- [ ] **Telegram:** заказ приходит с кнопками. «Принять» → в кабинете «Принят», приходит письмо. «Доставлен» → «Доставлен». «Отклонить» → «Отменён».
- [ ] **Отмена:** клиент отменяет непринятый заказ → сообщение в Telegram обновилось. Принятый заказ отменить нельзя.
- [ ] **Повтор заказа** подставляет поля.
- [ ] **«Маршрут»** показывает заглушку, отправить нельзя.
- [ ] **Вход:** неверный пароль → русская ошибка, кнопка не зависает.
- [ ] **Чужой заказ** по прямой ссылке → 404.

## 11. Отчёт

1. Коммиты и изменённые файлы по блокам.
2. Результаты Блока 0.
3. Отклонения от задачи и их причины.
4. Что осталось владельцу:
   - настройка Auth;
   - Site URL обратно на прод перед приглашением реальных клиентов;
   - тестовый клиент;
   - релиз.
5. Обновить STATE и PROPOSALS (contract-шаг). Задачу перенести в `docs/tasks/005-client-account.md`.
