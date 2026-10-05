# DB security — аудит доступа к данным (TASK-002 §4)

> Источник: baseline [`20261005224233_remote_schema.sql`](../../supabase/migrations/20261005224233_remote_schema.sql) (`4c86401`) + [`20260929205817_create_leads.sql`](../../supabase/migrations/20260929205817_create_leads.sql).
> Проверки в БД только на чтение: REST-запросы `select` с publishable key, `select` в SQL Editor. **Ничего не исправлялось.**
> Дата: 2026-10-06. Целевая матрица: [CURRENT.md §5](CURRENT.md).
> **[Факт]** — видно в миграции или подтверждено запросом. **[Предп.]** — вывод. ⏳ — ожидает проверки владельцем.
> Находки продублированы в [PROPOSALS.md](PROPOSALS.md) (P-14…P-21).

## 1. Матрица доступа

**Общее для всех таблиц `public`.** **[Факт]**
- RLS включён на всех 11 таблицах.
- `anon` и `authenticated` выданы **все** табличные привилегии: `select`, `insert`, `update`, `delete`, `truncate`, `references`, `trigger` (стандартные grants Supabase).
- Единственный барьер — RLS. Исключение — `leads`: там grants отозваны.
- Все политики — `permissive`, `for select`, `to public`. Политик на запись нет ни на одной таблице.

Эффективный доступ (✅ разрешено, ⛔ запрещено RLS или grants):

| Таблица | anon select | auth select | insert / update / delete (anon, auth) | Политика | Проверка anon (REST) |
|---|---|---|---|---|---|
| `delivery_slots` | ✅ | ✅ | ⛔ (нет политики) | `read slots`: `true` | 200, 3 строки |
| `zones` | ✅ | ✅ | ⛔ | `read zones`: `true` | 200, 5 строк |
| `zone_distances` | ✅ | ✅ | ⛔ | `read zone_distances`: `true` | 200, **0 строк** ⏳ |
| `retail_points` | ✅ | ✅ | ⛔ | `read retail_points`: `true` | 200, 9 строк |
| `skoro_pricing` | ✅ | ✅ | ⛔ | `read skoro_pricing`: `true` | 200, 1 строка |
| `service_config` | ⛔ | ⛔ | ⛔ | **нет** | 200, **0 строк** |
| `orders` | ⛔ (`auth.uid()` = null) | свои | ⛔ | `own orders`: `auth.uid() = user_id` | 200, 0 строк |
| `payments` | ⛔ | свои | ⛔ | `own payments`: `auth.uid() = user_id` | 200, 0 строк |
| `subscriptions` | ⛔ | свои | ⛔ | `own subscriptions`: `auth.uid() = user_id` | 200, 0 строк |
| `profiles` | ⛔ | своя | ⛔ | `own profile`: `auth.uid() = id` | 200, 0 строк |
| `leads` | ⛔ | ⛔ | ⛔ (grants отозваны) | нет (намеренно) | 401, `42501` |

`truncate` RLS не ограничивает, но через PostgREST он недоступен. **[Предп.]** Риск появится только при SQL-доступе от этих ролей.

Схема `public`: `has_schema_privilege(…, 'CREATE')` = `false` для `anon` и `authenticated`. **[Факт]** Проверено владельцем.

## 2. Функции

| Функция | Режим | `search_path` | `execute` |
|---|---|---|---|
| `create_order_for_user(p_from_address, p_to_address, p_slot_id, p_scheduled_for, p_recipient_contact, p_comment default null)` → `orders` | **security definer** | `'public'` (не `''`) | ⏳ В dump отсутствует. **[Предп.]** По умолчанию Supabase выдаёт `execute` ролям `anon`, `authenticated`, `service_role` |

Других функций в `public` нет **[Факт]** (по baseline). Триггеров на `auth.users` нет **[Факт]** (запрос владельца → 0 строк).

## 3. `create_order_for_user` по шагам

1. **`user_id` = `auth.uid()`.** Если `null` → исключение `not authenticated`. Анонимный вызов ничего не создаёт.
2. **Слот:** `select * from delivery_slots where id = p_slot_id`. Если слота нет → `invalid slot`. **Не проверяется**, подходит ли слот к `p_scheduled_for` (запас времени, рабочие часы, время в прошлом). Слот выбирает клиент.
3. **Абонемент:** самый новый по `purchased_at`, где `user_id = auth.uid()`, `status = 'active'`, `remaining_deliveries > 0`, с блокировкой `for update`. **`valid_until` не проверяется.**
4. **Если абонемент найден:**
   - `remaining_deliveries − 1`;
   - заказ: `status = 'new'`, `payment_status = 'paid'`, `price = 0`, `subscription_id` = абонемент.
5. **Если не найден:** заказ с `payment_status = 'pending_payment'` и `price = delivery_slots.base_price`.
6. **Возвращает** вставленную строку `orders`.

**Цена.** Только `base_price` слота. Километраж, доп. точки и доплаты, которые показывает калькулятор, не учитываются ([ADR-0004](adr/0004-pricing-single-source.md), открытый вопрос к TASK-004).

**Два активных абонемента.** Функция не падает, она берёт самый новый с остатком > 0. Падает приложение: `getActiveSubscription` использует `.maybeSingle()`, а он при двух строках возвращает ошибку. Уникального индекса нет: `subscriptions_user_id_idx` — частичный, но не `unique` (TASK-005).

## 4. Отклонения от целевой матрицы и находки

| # | Приоритет | Находка | Предложение |
|---|---|---|---|
| F-1 | 🔴 | `service_config`: RLS без политики, никто не читает. `/dashboard/orders/new` получает `serviceRes.data = null` → `pickSlot()` обращается к `service.operating_*` → форма нового заказа падает при выборе времени. **[Предп.]** Подтвердить: в таблице есть строка ⏳ | Миграция: `create policy … for select to anon, authenticated using (true)` по целевой матрице |
| F-2 | 🟠 | RPC доверяет слоту, выбранному клиентом. Можно заказать срочную доставку по цене дешёвого слота, на время в прошлом или вне рабочих часов | Валидация слота на сервере — TASK-005 (Server Action, Europe/Prague) |
| F-3 | 🟠 | Абонемент списывается без проверки `valid_until` | В TASK-005: условие `valid_until is null or valid_until > now()` |
| F-4 | 🟠 | Цена RPC (`base_price` слота) ≠ цена калькулятора | TASK-004 (ADR-0004) |
| F-5 | 🟠 | `security definer` с `search_path = 'public'` вместо `''` (ADR-0002 §6). Эксплуатация маловероятна: CREATE в `public` у клиентских ролей нет | Миграция: `alter function … set search_path = ''` + полные имена объектов в теле — вместе с TASK-005 |
| F-6 | 🟠 | `execute` на `create_order_for_user`, вероятно, открыт `anon` и `authenticated` ⏳. Для `authenticated` это ожидаемо до TASK-005 | Закрыть в TASK-005 по ADR-0003 |
| F-7 | 🟠 | Baseline начинается с `drop extension if exists "pg_net";` — артефакт diff. На удалённой БД не выполнится (миграция помечена применённой), но на новой (staging, локально) удалит `pg_net` | Решить до staging (TASK-006): отдельной миграцией вернуть `create extension if not exists pg_net`, если он нужен, или оставить. Сам baseline не редактировать |
| F-8 | 🟠 | `zone_distances` пуста для anon при политике `true`. **[Предп.]** Таблица пустая → калькулятор считает километраж = 0 ⏳ | Заполнить матрицу расстояний (данные, TASK-004) |
| F-9 | 🟠 | Опасные значения по умолчанию: `orders.payment_status = 'paid'`, `payments.status = 'paid'`. Любая вставка без явного статуса — «оплачено» | До TASK-006: default `'pending'` + `check`-ограничение на допустимые значения |
| F-10 | 🟢 | `anon` и `authenticated` имеют полные grants на все таблицы (кроме `leads`), защищает только RLS | Defense in depth: отозвать `insert/update/delete/truncate/references/trigger` у `anon` на всех таблицах, у `authenticated` — на справочниках |
| F-11 | 🟢 | Политики «своих строк» объявлены `to public`, а не `to authenticated`. Работает (`auth.uid()` у anon = null), но намерение неявное | Пересоздать `to authenticated` вместе с F-10 |
| F-12 | 🟢 | `on delete cascade` от `auth.users` к `orders` и `payments`: удаление пользователя стирает финансовую историю | Решить до TASK-006: `restrict` или мягкое удаление |
| F-13 | 🟢 | Нет `check (remaining_deliveries >= 0)`; `payment_status` и `status` — свободный текст | Добавить `check`-ограничения (TASK-005) |
| F-14 | 🟢 | `profiles` не создаётся автоматически: нет триггера на `auth.users` и политики insert | Учесть в задаче онбординга B2B |

## 5. Ожидает проверки владельцем ⏳

```sql
select 'service_config' as t, count(*) from service_config
union all select 'zone_distances', count(*) from zone_distances;

select p.proname, p.prosecdef, p.proconfig, p.proacl::text
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public';
```

Синхронность миграций: `npx supabase migration list --db-url "$DB_URL"` (обе версии в Local и Remote), `npx supabase db diff --db-url "$DB_URL"` (пусто).
