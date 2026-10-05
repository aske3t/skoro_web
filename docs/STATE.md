# STATE — состояние проекта Skoro (skoro-web)

> Снимок на 2026-10-06, ветка `chore/foundation` (TASK-002), от `dev` @ `cae9cbe`.
> **[Факт]** — видно в коде, истории или подтверждено проверкой. **[Предп.]** — вывод, требует проверки.
> Архитектура: [architecture/CURRENT.md](architecture/CURRENT.md), ADR в [architecture/adr/](architecture/adr/). Вопросы к архитектору: [architecture/PROPOSALS.md](architecture/PROPOSALS.md).
> Аудит БД: [architecture/db-security.md](architecture/db-security.md). Выполненные задачи: [tasks/](tasks/).

## Кратко

Сайт курьерской службы Skoro (Брно, CZ): лендинг с калькулятором, контактная форма (лиды) и личный кабинет B2B-клиента.
Стек: Next.js 15.5.27, React 19, TypeScript, Tailwind 3, Supabase, zod, vitest 5, ESLint 9. Node 22 LTS.
Дорожная карта — [CURRENT.md §10](architecture/CURRENT.md). TASK-001 влит в `dev`. TASK-002 выполнен агентом и ждёт PR в `dev`.

## Сделано

**TASK-001 — контактная форма → лиды** ([tasks/001-contact-form.md](tasks/001-contact-form.md)).
Влит в `dev` (PR #1, `cae9cbe`). Владелец прошёл ручной чек-лист.

**TASK-002 — фундамент** ([tasks/002-foundation.md](tasks/002-foundation.md)), ветка `chore/foundation`.

| Блок | Коммиты | Итог |
|---|---|---|
| Документы архитектора | `5b8f3b4` | CURRENT, ADR 0001–0004, TASK-002; TASK-001 перенесён в `docs/tasks/` |
| §5 Платформа | `c6fb7e5` | `engines >=22.12`, `.nvmrc`, `next` 15.5.27, `npm audit fix` без `--force` |
| §6 Линтер и CI | `5c6bcc7`, `679e167` | ESLint 9 (flat, `eslint-config-next` 15.5.27): 0 ошибок; `.github/workflows/ci.yml` |
| §7 Дефекты | `9864a5e`, `852d91a` | Autocomplete не пересоздаётся; time-trap по `elapsedMs` (часы клиента) |
| §8 Гигиена | `ecc1835`, `69ac69c`, `bd22ab8`, `bf2965b`, `f806fd8` | `.gitignore` (`supabase/.temp/`, `.claude/settings.local.json`); удалены `sr`, Nominatim, `Reviews`, `resolveRecipient`, `getProfile`, `personal.tsx`; макеты в `docs/design/` |
| §3 Схема БД | `4c86401` | Baseline `20261005224233_remote_schema.sql`; `leads` отмечена применённой. Триггеров на `auth.users` нет |
| §4 Аудит доступа | `9ee76b5` | `db-security.md`: матрица, функции, разбор `create_order_for_user`, 14 находок → PROPOSALS P-14…P-21 |

**[Факт]** Локально проходят: `npx tsc --noEmit`, `npm run lint` (0 ошибок, 8 предупреждений), `npm test` (29 тестов), `npm run build`.

## В работе

- **PR `chore/foundation` → `dev`** не открыт: `gh` не установлен, открывает владелец. CI ещё ни разу не запускался — он стартует на этом PR.
- **Ожидают проверки владельцем:**
  - синхронность миграций: `migration list`, `db diff`;
  - `count(*)` в `service_config` и `zone_distances`;
  - `proacl` функции `create_order_for_user`.

  Запросы — в [db-security.md §5](architecture/db-security.md).
- **Не сделано из TASK-002:** типизация Supabase-клиентов `<Database>`. Блокирует старый `@supabase/ssr` 0.5.2 (P-13).

## Следующие шаги

1. **Владелец:**
   - открыть PR `chore/foundation` → `dev`, дождаться зелёного CI, влить;
   - выполнить проверки из «В работе».
2. **Владелец — настройки из ADR-0001:**
   - Vercel: Production Branch = `main`, env по Production и Preview, Node 22.x;
   - GitHub: default branch `main`, защита `dev` и `main`.

   Затем создать `main` от `ec05ede` с тегом `prod-2026-05-17`, удалить `master` и `variant1`.
3. **Архитектор:**
   - решить P-13 (обновление `@supabase/ssr`);
   - решить 🔴 P-14 (`service_config` — форма заказа сломана);
   - решить P-15…P-21;
   - дать TASK-003.
4. **Ротация токена.** Удалить временный Supabase Access Token и старый `cli_…` (legacy) в Dashboard → Account → Access Tokens.

## Отклонения и вопросы

- **§8: типизация клиентов не выполнена** — откачена, P-13.
- **§3: `db pull` по `--linked` упал** с `EAUTHQUERY unsupported or invalid secret format`. Выгрузка сделана с `--db-url` (Session pooler). Прямой адрес БД доступен только по IPv6, в сети владельца IPv6 нет.
- **§3: в baseline первой строкой `drop extension if exists "pg_net"`** — артефакт diff, файл не редактировался (P-17).
- **§5: остаток `npm audit` — 6 high и 1 moderate**, закрываются только мажорными обновлениями:
  - `braces`, `micromatch`, `chokidar`, `fast-glob` — через Tailwind 3 → нужен Tailwind 4;
  - `postcss` внутри `next` → нужен Next 16.
- **§6: ESLint, 8 предупреждений** в зонах TASK-003 и TASK-004 оставлены без `eslint-disable`:
  - `layout.tsx` — неиспользуемые шрифты;
  - `WhySkoro` — `ShieldCheck`;
  - `HeroTracking` — `onSubmit` / `setTrackingNumber` не используются, это P-08;
  - `Calculator` — неиспользуемые типы и `setLocation`.
- **§7.1: проверка «один `.pac-container` на поле»** — по коду (зависимости эффекта стабильны). В браузере не проверялась.
- **§7.2: порядок `onSubmit` → `FormData` в React 19** подтверждён по исходникам `react-dom` 19.2. Ручная проверка в браузере не проводилась.
- **Вне TASK:** `vitest.config.ts` → `.mts` (предупреждение Vite о ESM).
- **Рабочая среда владельца:**
  - Node 22 стоит в `~/.local/node` (fnm недоступен из сети);
  - Supabase CLI работает через `SUPABASE_ACCESS_TOKEN` в env, потому что Связка ключей macOS не отдаёт сохранённый токен.

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
