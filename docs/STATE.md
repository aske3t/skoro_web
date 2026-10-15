# STATE — состояние проекта Skoro (skoro-web)

> Снимок на 2026-10-06, ветка `feature/static-landing` (TASK-003), от `dev` @ `3d548d2`.
> **[Факт]** — видно в коде, истории или подтверждено проверкой. **[Предп.]** — вывод, требует проверки.
> Архитектура: [architecture/CURRENT.md](architecture/CURRENT.md), ADR в [architecture/adr/](architecture/adr/). Вопросы к архитектору: [architecture/PROPOSALS.md](architecture/PROPOSALS.md).
> Аудит БД: [architecture/db-security.md](architecture/db-security.md). Выполненные задачи: [tasks/](tasks/).

## Кратко

Сайт курьерской службы Skoro (Брно, CZ): лендинг с калькулятором, контактная форма (лиды) и личный кабинет B2B-клиента.
Стек: Next.js 15.5.27, React 19, TypeScript, Tailwind 3, Supabase (`@supabase/ssr` 0.12.7, `supabase-js` 2.117.2), zod, vitest 5, ESLint 9. Node 22 LTS.
Дорожная карта — [CURRENT.md §10](architecture/CURRENT.md). TASK-001 и TASK-002 влиты в `dev`. TASK-003 влит в `dev` (PR #3, 2026-10-13) и перенесён в [tasks/003-static-landing.md](tasks/003-static-landing.md). Прод переключён на `main`.

## Сделано

**TASK-001** ([tasks/001-contact-form.md](tasks/001-contact-form.md)) — влит (PR #1).
**TASK-002** ([tasks/002-foundation.md](tasks/002-foundation.md)) — влит (PR #2, CI зелёный).

**TASK-003 — доступ к БД, статический лендинг, навигация** ([tasks/003-static-landing.md](tasks/003-static-landing.md)), влит в `dev` (PR #3).

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

**Статус TASK-003 (2026-10-13): закрыт.** Владелец прошёл ручные проверки на Preview `skoro-web-st78`, PR #3 влит в `dev`.

- **Vercel.** Боевой проект — **`skoro-web-st78`** (домен `skorouvas.cz`, Git → `aske3t/skoro_web`). Лишние проекты `skoro-web`, `skoro-web-zsta` и `project-jl4hd` удалены владельцем. Переменные окружения заданы для Production и Preview (секреты — как Secret). **Production Branch = `main`**: прод пересобран из `ec05ede` 2026-10-13 03:04 UTC, `skorouvas.cz` отвечает 200.
- **GitHub.** Default branch = `main`. Ветки `master`, `variant1`, `feature/contact-form`, `chore/foundation` и `feature/static-landing` удалены: всё их содержимое есть в `dev` или `main`. Тег `prod-2026-05-17` → `ec05ede`. Остались `main`, `dev` и ветка текущей работы.
- **Осталось владельцу:**
  1. GitHub → Settings → Branches: защита `dev` и `main` (merge только через PR, обязательный `check`);
  2. перевыпуск токена Telegram-бота: он попал на скриншот в чате;
  3. первый релиз `dev` → `main` — по готовности, PR `dev` → `main`.
- **Текущей задачи нет:** `docs/TASK.md` появится с TASK-004.

**Служебный Telegram-бот** (ветка `feature/telegram-bot`, живое описание — [telegram-bot.md](telegram-bot.md), P-28):
- Шаг 1 — каркас: grammy, route handler `/api/telegram/dispatch`, `bot:dev`, `bot:commands`, `/start`, `/help`, `/orders`. Закоммичен.
- Шаг 2 — кнопки «Взял в работу» / «Спам» под заявкой (только админы). Код и тесты готовы, миграция `20261014103738_leads_handled_by` применена владельцем, типы обновлены. Ждёт проверки владельца в Telegram. `tsc`, `lint`, `test` (59), `build` — зелёные.
- Шаг 3 — регистрация курьеров (`couriers`) — не начат.
- Вебхук не ставился: для проверок используется `bot:dev` (polling). Env для Vercel (Production и Preview): `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ADMIN_IDS`.

## Следующие шаги

1. **Владелец:** список выше.
2. **Архитектор:** P-22…P-27, затем TASK-004 — единый источник цен.
3. **Ротация токена:** удалить временный Supabase Access Token после работы с CLI.

## Отклонения и вопросы

**В рамках TASK-003:**
- **Navbar:** кнопка входа по-прежнему называется «Sign in» (в TASK написано «Войти»). Тексты лендинга по §8 не менялись.
- **Переключатель аудитории:** ссылка «Для физлиц» и логика `audience` удалены. Пилюля «Для бизнеса» оставлена всегда активной. Она перекрывается логотипом — это было и раньше, см. P-25.
- **Ссылка «Связаться с нами»:** получила `w-fit`. `<a>` с `flex` растягивается на всю строку, а `<button>` — нет.
- **Footer:** «Info → Cross city delivery» перенаправлена с `/tracking` на `/#services`. Ещё одна битая ссылка `/#reviews` — P-23.
- **ssr 0.12:** cache-заголовки из `setAll` не применяются — P-22.
- **`/dashboard` без публичных env → 500** — P-24.
- **Размер `/`:** First Load вырос 184 → 193 кБ из-за новых версий `supabase-js` и `ssr`.

**Вне TASK-003, по прямой просьбе владельца после тестов:**
- `415a74d` — в форме заказа под временем только «Слот: <название>» и цена для покупки без абонемента; «запас N мин» убран;
- `87cc49c` — CTA в шапке «Ship now» → «Заказать доставку» (на телефоне — «Заказать»), ведёт на `#contact`.

**Результаты тестов владельца на Preview (2026-10-13):** вход и заказ работают. Редирект `/dashboard/subscribition` владелец не увидел. Локально и в `routes-manifest` он есть (308); **[Предп.]** проверялся адрес без нового кода (например, `skorouvas.cz`) — ждёт подтверждения.

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
