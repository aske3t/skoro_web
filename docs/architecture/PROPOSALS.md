# Proposals — открытые вопросы к архитектору

> Живой список вопросов и предложений исполнителя (агента разработки), которым нужно архитектурное решение.
> Решённый пункт переносится в «Решено» с итогом и ссылкой на ADR или задачу.
> Контекст: [../STATE.md](../STATE.md), [CURRENT.md](CURRENT.md), [adr/](adr/), [../TASK.md](../TASK.md).
> Обновлено: 2026-10-06, ветка `chore/foundation` (TASK-002). Находки аудита БД: [db-security.md](db-security.md).

**Приоритет:** 🔴 блокирует или несёт риск сейчас · 🟠 нужно до следующей задачи · 🟢 можно позже.

## Открытые

### P-08 🟢 Трекинг заказов
- **Решено частично** ([CURRENT.md §11](CURRENT.md)): сейчас только B2B, аккаунты создаёт владелец, ссылка `/personal` убирается в TASK-003.
- **Открыто.** Форма трекинга в `HeroTracking` ведёт на удалённую `/tracking`. **[Факт]** Обработчик `onSubmit` в компоненте объявлен, но к форме не подключён (ESLint: `'onSubmit' is defined but never used`, `'setTrackingNumber' … never used`).
- **Вопрос владельцу.** Трекинг в плане? Если нет — убрать форму в TASK-003.

### P-13 🟠 Типизация Supabase-клиентов требует обновить `@supabase/ssr`
- **Факт.**
  - TASK-002 §8 требует `createBrowserClient<Database>` и `createServerClient<Database>`.
  - Установлены `@supabase/ssr` 0.5.2 и `@supabase/supabase-js` 2.103.3. Старый ssr возвращает `SupabaseClient<Database, SchemaName, Schema>`, а в supabase-js 2.103 третий параметр класса уже не `Schema`.
  - С дженериком типы RPC ломаются: `createOrder.ts` — «argument … is not assignable to parameter of type 'undefined'».
  - Отдельная настоящая неточность: в RPC передаётся `p_comment: null`, а сгенерированный тип ждёт `p_comment?: string`.
- **Сделано.** Типизация откачена, клиенты остались без дженерика. Поведение не менялось.
- **Предложение.** Обновить `@supabase/ssr` до 0.12.7 (peer: `@supabase/supabase-js` ^2.114.0) и `supabase-js` до актуальной 2.x отдельным коммитом, затем добавить `<Database>`. Это пункт бэклога CURRENT §10, который TASK-002 неявно требует.
- **Нужно решение.** Делать в TASK-002 (два обновления сверх разрешённых зависимостей) или перенести типизацию в отдельную задачу или в TASK-005, где переписывается `createOrder`?

### P-14 🔴 `service_config` никто не может прочитать — форма заказа ломается
- **Факт** (db-security F-1). RLS включён, политики нет; anon получает 0 строк. `/dashboard/orders/new` передаёт `serviceRes.data!` (= `null`) в `pickSlot()`.
- **Предложение.** Миграция с политикой `for select to anon, authenticated using (true)`. Это совпадает с целевой матрицей CURRENT §5, поэтому решение архитектора — только порядок: отдельный `fix/` сразу или в TASK-005?
- **Ожидает проверки:** в таблице есть строка (`select count(*) from service_config`).

### P-15 🟠 RPC заказа доверяет клиенту в слоте и не смотрит срок абонемента
- **Факт** (F-2, F-3, F-4). Слот не сверяется с `p_scheduled_for` (запас времени, рабочие часы, прошлое). `valid_until` абонемента не проверяется. Цена = `base_price` слота, а не формула калькулятора.
- **Предложение.** Закрыть в TASK-005 (серверный выбор слота по Europe/Prague, проверка `valid_until`) и TASK-004 (цена). Подтвердить, что это входит в их скоуп.

### P-16 🟠 Укрепление `create_order_for_user`
- **Факт** (F-5, F-6). `security definer` с `search_path = 'public'` вместо `''` (ADR-0002 §6). `execute`, вероятно, открыт `anon` и `authenticated` (ожидает проверки `proacl`). CREATE в `public` у клиентских ролей нет — риск низкий.
- **Предложение.** В TASK-005, когда функция станет внутренней: `set search_path = ''`, полные имена объектов, `revoke execute` у `public`, `anon`, `authenticated`.

### P-17 🟠 Baseline удаляет `pg_net`
- **Факт** (F-7). Первая строка baseline — `drop extension if exists "pg_net";` (артефакт diff). На удалённой БД не выполнялась, на новой (staging, локально) удалит расширение.
- **Вопрос.** Нужен ли `pg_net` (вебхуки БД, `net.http_*`)? Если да — отдельная миграция `create extension if not exists pg_net` до TASK-006. Baseline по ADR-0002 не редактируется.

### P-18 🟠 `zone_distances` пуста
- **Факт** (F-8). Политика `using (true)` есть, но anon получает 0 строк. **[Предп.]** Таблица пустая → калькулятор всегда считает 0 км (ожидает проверки `count(*)`).
- **Предложение.** Заполнить матрицу в TASK-004 (данные тарифов в БД по ADR-0004).

### P-19 🟠 Финансовые данные: опасные defaults и каскадное удаление
- **Факт** (F-9, F-12). `orders.payment_status` и `payments.status` по умолчанию `'paid'`. `on delete cascade` от `auth.users` стирает заказы и платежи.
- **Предложение.** До TASK-006: default `'pending'` + `check`; FK на `auth.users` — `restrict` или мягкое удаление пользователя.

### P-20 🟢 Defense in depth для grants и политик
- **Факт** (F-10, F-11, F-13). У `anon` и `authenticated` полные grants на все таблицы, кроме `leads`. Политики своих строк `to public`. Нет `check` на `remaining_deliveries >= 0` и на статусы.
- **Предложение.** Одна миграция: отозвать запись у `anon` везде и у `authenticated` на справочниках; политики `to authenticated`; `check`-ограничения. Сроки — на усмотрение архитектора.

### P-21 🟢 `profiles` не создаётся автоматически
- **Факт** (F-14). Нет триггера на `auth.users` (проверено: 0 строк) и политики insert.
- **Предложение.** Учесть в задаче онбординга B2B: строка `profiles` создаётся сервером при создании аккаунта.

## Решено

| # | Вопрос | Итог |
|---|---|---|
| P-01 | Ветки и деплой | [ADR-0001](adr/0001-branches-and-deploy.md): `main` — прод (от `ec05ede`), `dev` — интеграция, PR; деплой только через Git-интеграцию Vercel |
| P-02 | Схема БД вне репозитория | [ADR-0002](adr/0002-schema-as-code.md): миграции — источник истины; baseline в TASK-002 |
| P-03 | Версия Node | Node 22 LTS: `engines >=22.12`, `.nvmrc`, Vercel 22.x — сделано в TASK-002 (`c6fb7e5`) |
| P-04 | Уязвимости и Next 16 | Остаёмся на 15.5.x: Next 16 откачен, `next` 15.5.27, `npm audit fix` без `--force` (TASK-002, `c6fb7e5`). Next 16 — бэклог |
| P-05 | Где живёт серверная логика | [ADR-0003](adr/0003-server-write-path.md): все записи через сервер; `createOrder` → Server Action в TASK-005 |
| P-06 | Лендинг динамический | Статичный Navbar с клиентским островком входа, сужение matcher middleware — TASK-003 ([CURRENT §11](CURRENT.md)) |
| P-07 | Единый источник цен | [ADR-0004](adr/0004-pricing-single-source.md), TASK-004 |
| P-09 | Выбор геокодера | Только Google Places; Nominatim удалён в TASK-002 (`bd22ab8`) |
| P-10 | Time-trap и часы клиента | `elapsedMs` по часам клиента вместо абсолютной метки — TASK-002 (`852d91a`) |
| P-11 | Линтер и CI | ESLint 9 flat config + GitHub Actions — TASK-002 (`5c6bcc7`, `679e167`) |
| P-12 | Гигиена репозитория | TASK-002: `.gitignore` (`ecc1835`, `69ac69c`), мёртвый код (`bd22ab8`); типизация клиентов — см. P-13 |
| — | Константы формы тянули zod в клиентский бандл | `src/lib/leads/constants.ts` (TASK-001, `c314e50`) |
| — | Сверка ручных типов `leads` со схемой | Совпали; отличия только в BOM и форме хелперов новой версии CLI |
| — | Где хранить вопросы к архитектору | `docs/architecture/PROPOSALS.md` + процесс `/arch` → `/handoff` → `bin/arch-pack` (см. `CLAUDE.md`) |
