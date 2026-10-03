# Proposals — открытые вопросы к архитектору

> Живой список вопросов и предложений исполнителя (агента разработки), которым нужно архитектурное решение.
> Решённый пункт переносится в «Решено» с итогом и ссылкой на ADR или задачу.
> Контекст: [../STATE.md](../STATE.md), [CURRENT.md](CURRENT.md), [adr/](adr/), [../TASK.md](../TASK.md).
> Обновлено: 2026-10-03, ветка `chore/foundation` (TASK-002).

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
