# STATE — состояние проекта Skoro (skoro-web)

> Снимок на 2026-10-06, ветка `feature/static-landing` (TASK-003), от `dev` @ `3d548d2`.
> **[Факт]** — видно в коде, истории или подтверждено проверкой. **[Предп.]** — вывод, требует проверки.
> Архитектура: [architecture/CURRENT.md](architecture/CURRENT.md), ADR в [architecture/adr/](architecture/adr/). Вопросы к архитектору: [architecture/PROPOSALS.md](architecture/PROPOSALS.md).
> Аудит БД: [architecture/db-security.md](architecture/db-security.md). Выполненные задачи: [tasks/](tasks/).

## Кратко

Сайт курьерской службы Skoro (Брно, CZ): лендинг с калькулятором, контактная форма (лиды) и личный кабинет B2B-клиента.
Стек: Next.js 15.5.27, React 19, TypeScript, Tailwind 3, Supabase (`@supabase/ssr` 0.12.7, `supabase-js` 2.117.2), zod, vitest 5, ESLint 9. Node 22 LTS.
Дорожная карта — [CURRENT.md §10](architecture/CURRENT.md). TASK-001 и TASK-002 влиты в `dev`. TASK-003 выполнен агентом, ждёт проверок владельца и PR.

## Сделано

**TASK-001** ([tasks/001-contact-form.md](tasks/001-contact-form.md)) — влит (PR #1).
**TASK-002** ([tasks/002-foundation.md](tasks/002-foundation.md)) — влит (PR #2, CI зелёный).

**TASK-003 — доступ к БД, статический лендинг, навигация** ([TASK.md](TASK.md)), ветка `feature/static-landing`.

| Блок | Коммиты | Итог |
|---|---|---|
| Документы архитектора | `9fcbe13` | TASK-003, CURRENT от 2026-10-06 |
| 0. Доступ к БД | `c15e910`, `aa3935b` | Страница заказа без `service_config` показывает сообщение; миграция `20261006044808_harden_public_access` применена владельцем, REST-проверки пройдены |
| 1. Библиотеки и типизация | `db81c42`, `db06772` | ssr 0.12.7, supabase-js 2.117.2; `<Database>` на browser/server/middleware/admin; `p_comment: undefined` |
| 2. Статический лендинг | `ebdfc2c` | `/` и `/login` — `○` Static; Navbar без серверного Supabase; статус входа — клиентский островок; matcher middleware сужен |
| 3. Навигация | `8c8b335` | Без `/personal` и трекинга; CTA Hero → `#contact`; `/dashboard/subscription` + 308-редирект |
| 4. Ветка `main` | — (git) | `main` и тег `prod-2026-05-17` на `ec05ede` запушены |

**Диагностика (п. 3.1):** `service_config` = 1 строка; `zone_distances` = 0; `proacl` RPC до миграции = `{=X/postgres, postgres=X, anon=X, authenticated=X, service_role=X}`.

**[Факт]** Локально проходят:
- `tsc`;
- `lint`: 0 ошибок, 3 предупреждения — только `Calculator.tsx`;
- `test`: 29;
- `build`: `/` — `○`;
- `/` → 200 без `NEXT_PUBLIC_SUPABASE_*`.

## В работе

- **Владелец, ADR-0001:**
  - Vercel: Production Branch = `main`, env для Production и Preview, Node 22.x;
  - GitHub: default branch `main`, защита `dev` и `main` (PR + CI `check`);
  - затем подтверждение — агент удалит `master` и `variant1`.
- **PR `feature/static-landing` → `dev`:** открыть, дождаться CI, пройти ручные проверки TASK-003 §9 на Vercel Preview.
- **После подтверждения:** перенести `docs/TASK.md` в `docs/tasks/003-static-landing.md`.

## Следующие шаги

1. **Владелец:** шаги из «В работе».
2. **Архитектор:** P-22…P-24 (все 🟢), затем TASK-004 — единый источник цен.
3. **Ротация токена:** удалить временный Supabase Access Token после работы с CLI.

## Отклонения и вопросы

- **Navbar:** кнопка входа по-прежнему называется «Sign in» (в TASK написано «Войти»). Тексты лендинга по §8 не менялись.
- **Переключатель аудитории:** ссылка «Для физлиц» и логика `audience` удалены. Пилюля «Для бизнеса» оставлена всегда активной, чтобы не менять вёрстку шапки.
- **Ссылка «Связаться с нами»:** получила `w-fit`. `<a>` с `flex` растягивается на всю строку, а `<button>` — нет; так визуально ничего не меняется.
- **Footer:** ссылка «Info → Cross city delivery» перенаправлена с `/tracking` на `/#services` — иначе не выполнить критерий `grep`. Ещё одна битая ссылка `/#reviews` — P-23.
- **ssr 0.12:** cache-заголовки из `setAll` не применяются, поведение не менялось — P-22.
- **`/dashboard` без публичных env → 500** — P-24, вне скоупа.
- **Размер `/`:** First Load вырос 184 → 193 кБ из-за новых версий `supabase-js` и `ssr`. Browser-клиент Supabase и так грузился на лендинге через калькулятор.
- **Не проверено в браузере:**
  - отсутствие сдвига вёрстки при загрузке;
  - вход и выход в Navbar;
  - создание заказа;
  - прокрутка к форме.

## Как запустить и проверить

```bash
npm install
cp .env.example .env.local   # заполнить, см. README → Environment variables
npm run dev                  # http://localhost:3000
npx tsc --noEmit && npm run lint && npm test && npm run build   # то же, что CI
```

- Supabase CLI (из сети владельца):
  ```bash
  read -s SUPABASE_ACCESS_TOKEN && export SUPABASE_ACCESS_TOKEN
  read -s DB_URL && export DB_URL   # строка Session pooler с паролем БД
  npx supabase migration list --db-url "$DB_URL"
  ```
- Генерация типов — через временный файл (см. `CLAUDE.md`).
- Для ЛК нужен пользователь в Supabase Auth: аккаунты создаёт владелец.
- **Не проверено:**
  - CI на GitHub;
  - Autocomplete и time-trap в браузере;
  - форма нового заказа (P-14).
