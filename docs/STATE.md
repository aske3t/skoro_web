# STATE — состояние проекта Skoro (skoro-web)

> Снимок на 2026-09-30, ветка `feature/contact-form` @ `c314e50` (от `dev` @ `ce1cd21`).
> **[Факт]** — видно в коде/истории. **[Предп.]** — вывод, требует проверки.
> Архитектура: `CURRENT.md` пока нет, справочно — [architecture/AS-IS.md](architecture/AS-IS.md) (реконструкция от 2026-09-29).
> Вопросы к архитектору: [architecture/PROPOSALS.md](architecture/PROPOSALS.md). Текущая задача: [TASK.md](TASK.md).

## Кратко

Сайт курьерской службы Skoro (Брно, CZ): лендинг с калькулятором доставки, контактная форма и личный кабинет клиента (заказы, платежи, абонемент).
Стек: Next.js 15 (закоммичено; в рабочей копии Next 16, см. «В работе»), React 19, TypeScript, Tailwind 3, Supabase (Auth + Postgres), zod, vitest, Google Maps Places.
После простоя с 2026-06-10 работа возобновлена 2026-09-29: аудит, восстановление доступа к Supabase, TASK-001 (контактная форма).

## Сделано

**Аудит (2026-09-29)** — `docs/STATE.md` (эта версия заменяет первую), `docs/architecture/AS-IS.md`.

**Доступ к Supabase** — проект `skoro_web` активен. В `.env.local` владелец вписал реальные URL и publishable key (раньше там были плейсхолдеры).

**TASK-001: контактная форма → лиды** — ветка `feature/contact-form`, 8 коммитов (`f5f8583`…`c314e50`), в `dev` не влита.

- **[Факт]** Таблица `public.leads`:
  - миграция `supabase/migrations/20260929205817_create_leads.sql`;
  - RLS включён без политик, права `anon` и `authenticated` отозваны;
  - владелец применил её через SQL Editor. Проверено: запрос с anon key → `42501 permission denied for table leads`.
- **[Факт]** Server Action `submitLead` (`src/lib/leads/actions.ts`):
  - honeypot и time-trap;
  - zod-валидация (`schema.ts`);
  - rate-limit по `ip_hash` через БД (`spam.ts`);
  - запись через admin-клиент (`src/lib/supabase/admin.ts`, `server-only`);
  - уведомление в Telegram через `after()` (`notify.ts`).
- **[Факт]** `ContactForm.tsx`: `useActionState`; `name`/`required`/`maxLength`/`autoComplete` на полях; скрытые поля `kind`/`startedAt`/`utm`/`website`; состояния pending/success/error. Форма работает и без JS.
- **[Факт]** Константы формы вынесены в `src/lib/leads/constants.ts`, поэтому zod не попадает в клиентский бандл. First Load `/`: 210 → 185 кБ.
- **[Факт]** Unit-тесты: `schema.test.ts`, `notify.test.ts`. vitest настроен (`vitest.config.ts`, `npm test`).
- **[Факт]** Проверки на момент коммитов (Next 15.5.18, Node 20.12):
  - `tsc --noEmit` ✅;
  - `npm run build` ✅;
  - секретов в `.next/static` нет ✅;
  - без серверных env главная отдаёт 200 ✅.
- **[Факт]** Типы `leads` в `src/types/database.ts` сверены перегенерацией (`supabase gen types`): расхождений в таблицах нет. Отличаются только BOM и форма хелперов в новом CLI; с новым файлом `tsc` ✅.

**Процесс работы с архитектором** (не закоммичено):
- `CLAUDE.md`;
- команды `.claude/commands/{arch,handoff,analyze}.md`;
- скрипт `bin/arch-pack`;
- `docs/architecture/PROPOSALS.md`, папка `docs/architecture/adr/`.

## В работе

- **[Факт]** Незакоммичено в рабочей копии `feature/contact-form`:
  - `src/types/database.ts` — перегенерированные типы (готово к коммиту);
  - `package.json`, `package-lock.json` — `next` `^15.1.3` → `^16.3.7`. **[Предп.]** Это результат `npm audit fix --force`. Next 16.3.7 уже установлен в `node_modules`;
  - `tsconfig.json` — переписан Next 16 при запуске (`jsx: react-jsx`, `.next/dev/types/**/*.ts`);
  - `supabase/.temp/cli-latest` — служебный файл CLI (v2.102.0 → v2.118.0);
  - `CLAUDE.md`, `.claude/commands/`, `bin/`, `docs/` — новые, не отслеживаются.
- **[Факт]** Серверные переменные (`SUPABASE_SECRET_KEY`, `LEAD_IP_SALT`, `TELEGRAM_*`) при последней проверке в `.env.local` отсутствовали. Пока их нет, форма возвращает `server_error`.
- **[Факт]** Локальный Node обновлён до 22.23.3 (`~/.local/node`), в `node_modules` есть бинарник `@rolldown/binding-darwin-arm64`.

## Следующие шаги

1. **Решить судьбу Next 16** (PROPOSALS P-04):
   - либо откатить `package*.json` и `tsconfig.json` и сделать `npm audit fix` без `--force`;
   - либо оформить миграцию на 16 отдельной задачей.
2. **Прогнать `npm test`** — тесты ещё ни разу не запускались. Затем `npm run build` на выбранной версии Next.
3. **Закоммитить:**
   - процесс (`CLAUDE.md`, `.claude/commands/`, `bin/`, `docs/`);
   - типы (`src/types/database.ts`).
4. **Заполнить `.env.local`:** `SUPABASE_SECRET_KEY`, `LEAD_IP_SALT`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
5. **Пройти ручной чек-лист TASK-001** (п. 12 [TASK.md](TASK.md)), затем влить `feature/contact-form` в `dev`.
6. **Отметить миграцию как применённую** (PROPOSALS P-02): `npx supabase migration repair --status applied 20260929205817`.
7. **Передать пакет архитектору** (`./bin/arch-pack`) и получить `CURRENT.md`.

## Отклонения и вопросы

**Отклонения TASK-001 от задачи** (подробно — в отчёте по задаче):
- **Новый файл `constants.ts`** — вне списка п. 5, согласовано с владельцем.
- **Телефон:** сырой ввод ограничен 32 символами; `+49 30 1234567` → `+49301234567` (разделители удаляются).
- **UTM:** значение длиннее 200 символов отбрасывается, а не обрезается.
- **Time-trap:** метка `startedAt` из будущего не блокирует отправку.
- **Без `LEAD_IP_SALT`** форма возвращает `server_error`.
- **`.env.example`:** в коммит `3dbe8db` вошли старые незакоммиченные плейсхолдеры Google Maps и Nominatim.

**Известные проблемы вне TASK-001** — из аудита, актуальны:
- **Битые ссылки:** `/tracking` (HeroTracking), `/personal` (Navbar).
- **Форма подписки в Footer** не отправляется (отдельная задача по TASK-001 §13).
- **Схемы БД в репозитории нет**, кроме `leads` (P-02).
- **Цены заданы в трёх местах** (P-07).
- **Мёртвый код:**
  - `AddressLookupInput` + `/api/geocode/search`;
  - `Reviews`;
  - `resolveRecipient`;
  - `getProfile`;
  - пустой `app/personal/personal.tsx`.
- **Нет ESLint и CI** (P-11). `npm audit`: critical в `next` 15 (P-04).
- **Все маршруты, включая `/`, рендерятся динамически** из-за `Navbar` в корневом layout (P-06).
- **Рассинхрон документов:**
  - TASK.md называет прод-веткой `variant1`, но `origin/variant1` целиком входит в `dev` (P-01);
  - A7 в TASK.md ссылается на «HTTP 500 в STATE» — в STATE такого описания нет.

## Как запустить и проверить

Node 22 LTS (≥ 22.12). После смены версии Node: `rm -rf node_modules && npm install`.

```bash
npm install
cp .env.example .env.local   # заполнить, см. README → Environment variables
npm run dev                  # http://localhost:3000
npm test                     # vitest: src/lib/leads/*.test.ts
npx tsc --noEmit
npm run build
```

- Для калькулятора и ЛК нужны справочники в Supabase: zones, retail_points, zone_distances, skoro_pricing, delivery_slots, service_config. Сидов в репозитории нет.
- Для ЛК нужен пользователь в Supabase Auth: регистрации в UI нет.
- Контактная форма: ручной чек-лист — п. 12 [TASK.md](TASK.md).
- Не проверено в этой сессии:
  - `npm test` (ни разу);
  - `npm run build` на Next 16;
  - отправка формы с реальными серверными env.
