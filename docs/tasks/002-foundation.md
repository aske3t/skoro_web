# TASK-002: фундамент — схема БД в репозитории, quality gate, гигиена

> Архитектура: [architecture/CURRENT.md](../architecture/CURRENT.md), ADR [0001](../architecture/adr/0001-branches-and-deploy.md)–[0004](../architecture/adr/0004-pricing-single-source.md).
> Базовая ветка: `dev` (после влития TASK-001). Рабочая ветка: `chore/foundation`, запушить сразу.
> Решения зафиксированы. Если какое-то мешает, остановись и опиши проблему в PROPOSALS, не меняй его самостоятельно.

## 1. Зачем

Следующие задачи — цены, заказ на сервере, оплата — меняют логику, которая сейчас спрятана в удалённой БД (RPC, RLS). Пока схемы нет в репозитории, их нельзя спроектировать и проверить.

Эта задача:
- выгружает схему;
- описывает фактический доступ к данным;
- ставит минимальный quality gate, который проверяет каждый следующий PR агента;
- убирает мусор.

Функциональность для пользователя не меняется, за исключением двух мелких дефектов из п. 7.

## 2. Предусловия

- [ ] TASK-001 влит в `dev`. Next откачен на 15.5.x: незакоммиченное обновление до 16 отброшено.
- [ ] Docker запущен — нужен для `supabase db pull` и `db diff`. Если Docker недоступен, используй fallback из п. 3.
- [ ] Владелец рядом: `supabase link` спросит пароль БД.

## 3. Схема БД (ADR-0002)

1. `npx supabase link --project-ref <ref>` (ref — из URL проекта в Dashboard).
2. `npx supabase migration repair 20260929205817 --status applied`. Это пишет только в таблицу истории миграций. **Перед выполнением покажи команду владельцу.**
3. `npx supabase db pull`. Получившуюся миграцию `<ts>_remote_schema.sql` не редактировать.
4. Триггеры на `auth.users`:
   ```sql
   select tgname, pg_get_triggerdef(t.oid)
   from pg_trigger t
   where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
   ```
   Если они есть, оформи отдельную миграцию только с `create trigger` (функции триггеров уже попали в baseline из `public`). Если миграция окажется пустой, не создавай её и напиши об этом в отчёте.
5. Проверки:
   - `npx supabase migration list` — обе версии есть и в Local, и в Remote;
   - `npx supabase db diff --linked` — пусто.
6. **Fallback без Docker.** `pg_dump --schema-only --schema=public` из libpq по connection string (Session pooler из Dashboard), **с** привилегиями. Результат сохранить как `<ts>_baseline.sql`, затем выполнить `migration repair <ts> --status applied`. Отклонение описать в отчёте.
7. **Удалённую схему не менять.** Никаких `db push`, `db reset --linked`, правок RLS.

## 4. Аудит доступа → `docs/architecture/db-security.md`

Собрать по baseline-миграции (запросы в БД — только `select`):

1. **Матрица доступа.** Таблица × роль (`anon`, `authenticated`) × операция (`select`/`insert`/`update`/`delete`): RLS вкл./выкл., политики и их условия, grants.
2. **Функции.** Для каждой: `security definer` или `invoker`, есть ли `set search_path`, кому выдан `execute`.
3. **`create_order_for_user` по шагам, словами.** Нужно ответить на вопросы:
   - откуда берётся `user_id`;
   - считается ли цена и по какой формуле;
   - как списывается абонемент;
   - что пишется в `payment_status`;
   - что происходит при двух активных абонементах.
4. **Сравнение с целевой матрицей** из [CURRENT.md §5](../architecture/CURRENT.md). Каждое отклонение — находка с приоритетом 🔴/🟠/🟢 и предложением исправления, продублированная в PROPOSALS.

**Ничего не исправлять.** Исправления RLS пойдут отдельными миграциями после решения архитектора.

## 5. Платформа (P-03, P-04)

- `package.json`:
  - `"engines": { "node": ">=22.12" }`;
  - `"next": "^15.5.27"` (или новее в рамках 15.5.x).
- `.nvmrc` со значением `22`.
- `npm audit fix` без `--force`. После него `npm audit` не должен показывать critical и high. Если что-то закрывается только мажорным обновлением, оставить и перечислить в отчёте.

## 6. Quality gate (P-11)

1. **ESLint 9, flat config:**
   - `eslint.config.mjs` + `eslint-config-next` той же версии, что `next`, через `FlatCompat`, как в шаблоне create-next-app 15: `next/core-web-vitals`, `next/typescript`;
   - скрипт `"lint": "eslint ."` вместо `next lint`.
2. **`npm run lint` → 0 ошибок.**
   - В старом коде разрешены только механические правки: неиспользуемые импорты, `let` → `const` и т. п.
   - Если правка меняет поведение, ставь `// eslint-disable-next-line <rule> -- TODO(TASK-00X)` и перечисли все такие места в отчёте.
   - `react-hooks/exhaustive-deps` — уровень `warn`.
3. **`.github/workflows/ci.yml`:**
   - триггеры: `pull_request` в `dev` и `main`, `push` в `dev`;
   - актуальные мажорные версии `actions/checkout` и `actions/setup-node`, `node-version-file: .nvmrc`, кэш npm;
   - шаги: `npm ci` → `npx tsc --noEmit` → `npm run lint` → `npm test` → `npm run build`;
   - для build — фиктивные `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` в `env` workflow; серверные секреты не нужны (A7).

## 7. Мелкие дефекты

1. **Google Autocomplete пересоздаётся на каждый рендер.**
   - Причина: в `src/lib/maps/adressAutocomplete.ts` `onSelect` стоит в зависимостях эффекта, а `googleautocomplete.tsx` передаёт его inline-стрелкой.
   - Исправление: хранить колбэк в `useRef` (обновлять `ref.current` в каждом рендере) и убрать его из deps.
   - Проверка: после ввода 10 символов в DOM ровно по одному `.pac-container` на поле.
   - Логику калькулятора не трогать.
2. **Time-trap лидов (P-10).**
   - Заменить сравнение абсолютной метки клиента с часами сервера на длительность по часам клиента.
   - Клиент: время монтирования хранится в ref. В `onSubmit` формы записать в скрытое поле `elapsedMs` значение `Date.now() − mountedAt`. React 19 вызывает `onSubmit` до сбора `FormData` для action — проверь это вручную.
   - Сервер: `elapsedMs < 3000` → тихий «успех» без записи. Поля нет (JS выключен) → пропустить.
   - Обновить тесты схемы.

## 8. Гигиена (P-09, P-12)

- **`.gitignore` + `git rm --cached`:** `supabase/.temp/`, `.claude/settings.local.json`.
- **Удалить `sr`.** PNG-макеты из корня перенести в `docs/design/`.
- **Удалить мёртвый код:**
  - `components/calculator/AddressLookupInput.tsx`;
  - `app/api/geocode/search/`;
  - `NOMINATIM_USER_AGENT` из `.env.example` и README;
  - `components/sections/Reviews.tsx`;
  - `resolveRecipient()`;
  - `getProfile()`;
  - пустой `app/personal/personal.tsx`.

  Ссылку `/personal` в Navbar не трогать, это TASK-003. Перед удалением подтверди через `grep`, что импортов нет.
- **Типизировать клиенты:** `createBrowserClient<Database>`, `createServerClient<Database>`.
  - Ошибки типов в существующих запросах исправлять без изменения поведения.
  - Если без изменения поведения не получается, перечислить в отчёте.
- **Документы:**
  - TASK-001 перенести в `docs/tasks/001-contact-form.md` и починить в нём ссылки;
  - этот файл по завершении перенести в `docs/tasks/002-foundation.md`;
  - в шапку `AS-IS.md` добавить: «Заменён [CURRENT.md](CURRENT.md) 2026-10-02»;
  - в PROPOSALS перенести P-01…P-12 в «Решено» со ссылками на ADR и задачи (журнал — [CURRENT.md §11](../architecture/CURRENT.md)); P-08 (трекинг) оставить открытым;
  - обновить STATE.

## 9. Ограничения

- **Схема удалённой БД:** допускается только `migration repair` из п. 3.2 (после показа владельцу). Больше никаких изменений.
- **Не трогать:** Navbar, layout, middleware, лендинг (это TASK-003); логику калькулятора и цен (TASK-004); форму заказа (TASK-005).
- **Новые зависимости:** только `eslint`, `eslint-config-next`, `@eslint/eslintrc`. Любые другие — спросить.
- **Юридические тексты не трогать.**
- **Один блок (пп. 3–8) — один или несколько осмысленных коммитов.** Не смешивать блоки в одном коммите.

## 10. Критерии приёмки

- [ ] `supabase/migrations/` содержит baseline и `create_leads`; `migration list` синхронен; `db diff --linked` пуст.
- [ ] `docs/architecture/db-security.md` описывает матрицу, функции и `create_order_for_user`; находки продублированы в PROPOSALS.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` проходят локально.
- [ ] CI на PR `chore/foundation` → `dev` зелёный.
- [ ] `npm audit`: нет critical и high, либо остаток перечислен с причиной.
- [ ] В git нет `supabase/.temp/`, `.claude/settings.local.json`, `sr`.
- [ ] `grep -r "geocode/search\|AddressLookupInput\|NOMINATIM" src` пуст.
- [ ] Autocomplete: один `.pac-container` на поле после ввода; калькулятор считает как раньше (ручной смоук обоих режимов).
- [ ] Контактная форма: заявка, отправленная через 5+ секунд, сохраняется; заявка быстрее 3 секунд тихо отбрасывается; без JS форма работает.

## 11. Отчёт

1. Коммиты и изменённые файлы по блокам.
2. Отклонения от задачи и их причины (в том числе fallback без Docker, если был).
3. Список `eslint-disable` с TODO.
4. Краткая выжимка находок `db-security.md` — 🔴 первыми.
5. Шаги для владельца:
   - настройки Vercel и GitHub из ADR-0001;
   - защита веток после появления CI.
