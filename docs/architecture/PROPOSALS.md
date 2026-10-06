# Proposals — открытые вопросы к архитектору

> Живой список вопросов и предложений исполнителя (агента разработки), которым нужно архитектурное решение.
> Решённый пункт переносится в «Решено» с итогом и ссылкой на ADR или задачу.
> Контекст: [../STATE.md](../STATE.md), [CURRENT.md](CURRENT.md), [adr/](adr/), [../TASK.md](../TASK.md).
> Обновлено: 2026-10-06, ветка `feature/static-landing` (TASK-003). Находки аудита БД: [db-security.md](db-security.md).

**Приоритет:** 🔴 блокирует или несёт риск сейчас · 🟠 нужно до следующей задачи · 🟢 можно позже.

## Открытые

### P-22 🟢 Cache-заголовки при записи auth-cookie (`@supabase/ssr` 0.12)
- **Факт.** В 0.12 `setAll(cookies, headers)` передаёт вторым аргументом `Cache-Control: private, no-cache, no-store…`, `Expires: 0`, `Pragma: no-cache`. Библиотека требует ставить их на ответ, чтобы CDN не закэшировал чужую сессию. В `lib/supabase/middleware.ts` и `server.ts` `headers` не используется: TASK-003 §4.2 запрещает менять поведение.
- **Риск.** Низкий: после TASK-003 middleware работает только на динамических `/dashboard`, `/login` и `/auth`, а Next ставит им `no-store`.
- **Предложение.** В middleware добавить `Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v))` — две строки, по примеру из документации ssr. Можно в TASK-005.

### P-23 🟢 Битая ссылка в Footer на удалённую секцию
- **Факт.** «Our partners → Only Quality» ведёт на `/#reviews`, а секция `Reviews` удалена в TASK-002. Ссылка «Info → Cross city delivery» вела на `/tracking`; в TASK-003 она перенаправлена на `/#services`, чтобы выполнить критерий `grep`. Текст не менялся.
- **Вопрос владельцу.** Куда ведёт «Only Quality» (у остальных партнёров внешние сайты)? Нужна ли колонка «Info» с одной ссылкой-дублем?

### P-24 🟢 `/dashboard` без `NEXT_PUBLIC_SUPABASE_*` отдаёт 500
- **Факт.** `lib/supabase/server.ts` создаёт клиент с `process.env…!`. Без публичных ключей `createServerClient` бросает исключение: `Your project's URL and Key are required…`. Лендинг после TASK-003 от этого не зависит (проверено: `/` → 200).
- **Предложение.** По правилу ленивых env (CURRENT §2) отдавать понятную страницу ошибки ЛК вместо 500. Можно в TASK-005.

## Решено

| # | Вопрос | Итог |
|---|---|---|
| P-08 | Трекинг заказов | Форма в Hero заменена CTA на `#contact` (TASK-003, `8c8b335`); трекинг — бэклог после TASK-005 |
| P-13 | Обновить `@supabase/ssr` и типизировать клиенты | ssr 0.12.7, supabase-js 2.117.2, `<Database>` на всех клиентах, `p_comment: undefined` (TASK-003, `db81c42`, `db06772`) |
| P-14 | `service_config` не читается | Политика чтения (миграция `20261006044808`, `aa3935b`) + защита страницы (`c15e910`) — TASK-003 |
| P-15 | Доверие RPC к слоту, `valid_until`, цена | Цена — TASK-004; слот и `valid_until` — TASK-005 |
| P-16 | Укрепление `create_order_for_user` | `execute` отозван у `public` и `anon` (TASK-003, `aa3935b`); `search_path` и внутренняя функция — TASK-005 |
| P-17 | Baseline удаляет `pg_net` | `pg_net` не нужен; закрыто ([CURRENT §12](CURRENT.md)) |
| P-18 | `zone_distances` пуста | Подтверждено `count(*) = 0`; заполнение — TASK-004 |
| P-19 | Финансовые defaults и каскад | `orders` — TASK-005, `payments` — TASK-006 |
| P-20 | Grants и политики | Запись у `anon`/`authenticated` отозвана, включая default privileges; политики с явными ролями (TASK-003, `aa3935b`); `check` — TASK-005 |
| P-21 | `profiles` не создаётся | Бэклог, онбординг B2B |
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
