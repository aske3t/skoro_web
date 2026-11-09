# CLAUDE.md — правила работы в проекте Skoro

Сайт курьерской службы Skoro (Брно): лендинг с калькулятором доставки, контактная форма (лиды), личный кабинет клиента и два Telegram-бота: служебный и клиентский (пилот).
Стек: Next.js 15 (App Router), React 19, TypeScript, Tailwind 3, Supabase (Auth + Postgres), zod, vitest.

## Роли и документы

Память проекта хранится в репозитории, а не в чате.

| Файл | Кто ведёт | Что внутри |
|---|---|---|
| `docs/architecture/CURRENT.md` | архитектор | Текущая целевая архитектура. Источник истины |
| `docs/architecture/adr/NNNN-*.md` | архитектор | Принятые решения (ADR) |
| `docs/architecture/AS-IS.md` | агент (разово) | Реконструкция «как есть» по коду, для справки |
| `docs/architecture/PROPOSALS.md` | агент | Открытые вопросы и предложения к архитектору |
| `docs/STATE.md` | агент | Состояние разработки: сделано, в работе, следующие шаги |
| `docs/TASK.md` | архитектор / владелец | Текущая задача с зафиксированными решениями |
| `docs/tasks/NNN-*.md` | агент (перенос) | Архив выполненных задач |
| `docs/architecture/db-security.md` | агент | Аудит доступа к БД (RLS, grants, функции) |

- Архитектуру меняет только архитектор. Агент не правит `CURRENT.md` и `adr/`.
- Упёрся в архитектурный вопрос или требование противоречит коду: остановись, запиши вопрос в `PROPOSALS.md` и спроси владельца. Не решай сам.
- В документах разделяй **[Факт]** (видно в коде) и **[Предп.]** (вывод).
- Команды сессии: `/arch` — в начале, `/handoff` — в конце, `/analyze` — аудит давно не тронутого проекта.

## Команды

Node 22 LTS (≥ 22.12; vitest 5 на Node 20 не работает).

```bash
npm install
npm run dev           # http://localhost:3000
npm run build
npm test              # vitest, тесты в src/**/*.test.ts
npm run lint          # eslint .
npx tsc --noEmit
```

Генерация типов БД — только через временный файл (`>` обнуляет цель, если команда упала):

```bash
npx supabase gen types typescript --project-id ukdxpdprxkcslydfobno > /tmp/db.ts && mv /tmp/db.ts src/types/database.ts
```

## Структура

- `src/app/` — два корневых layout (P-47):
  - `(site)/` — сайт со своим layout (шапка, футер, шрифты): `/`, `/services/*`, `/personal/*`, `/insurance`, `/contract`, `/login`, `/dashboard/*`. Группа в скобках в адрес не входит;
  - `tg/` — Mini App клиентского бота: свой layout без шапки и футера, тема Telegram;
  - route handlers `auth/*`, `api/telegram/*` — вне обеих групп.
- `src/components/` — `sections/` (лендинг), `calculator/`, `account/` (ЛК), `layout/`, `ui/`.
- `src/lib/` — `supabase/` (клиенты: browser, server, middleware, `admin.ts` server-only), `leads/` (контактная форма), `newsletter/`, `email/`, `telegram/` (боты), `pricing/`, `calculator/`, `account/`, `maps/`.
- `src/types/database.ts` — сгенерированные типы Supabase.
- `supabase/migrations/` — источник истины схемы (ADR-0002): `create_leads`, baseline `remote_schema`, `harden_public_access`, расширения `leads_*`, `newsletter_subscribers`. Полный список — в самой папке. Аудит доступа — `docs/architecture/db-security.md`.

## Telegram-боты

Два бота, общие сервер и БД (ADR-0006 §4). Сообщениями в Telegram они не обмениваются: связь — через БД и серверный код. Подробно — `docs/telegram-bot.md`.

| | Служебный (нынешний) | Клиентский (новый, пилот) |
|---|---|---|
| Кто и где | админы, позже курьеры; группа «Заявки» и личка | клиенты и гости; только личка |
| Что делает | карточки заявок и заказов с кнопками, `/invite` | вход по приглашению, меню, Mini App, «Мои заказы», статусы клиенту |
| Env | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_CHAT_ID`, `TELEGRAM_ADMIN_IDS` | `TELEGRAM_CLIENT_BOT_TOKEN`, `TELEGRAM_CLIENT_WEBHOOK_SECRET`, `TELEGRAM_CLIENT_BOT_USERNAME`, `APP_URL` |
| Вебхук | `/api/telegram/dispatch` | `/api/telegram/client` |
| Код | `src/lib/telegram/` | `src/lib/telegram/client/` |

- Нажатие кнопки получает только бот-отправитель, и только он может править своё сообщение. Поэтому карточку заказа шлёт и обрабатывает служебный бот, а клиенту пишет клиентский.
- Разработка — на двух dev-ботах с тестовой группой (ADR-0006 §8). Токен, вебхук и профиль боевого служебного бота не менять.

## Правила для агента

- Работа в `feature/*` от `dev`. Коммиты мелкие и осмысленные, с кодом коммить и изменения `docs/`.
- Не применять миграции к удалённой БД (`supabase db push`, `db reset`, `migration up`). Миграции применяет владелец.
- Секреты не выводить и не коммитить. `.env.local` не трогать. Серверные ключи — без префикса `NEXT_PUBLIC_`, читаются лениво и только в модулях с `import "server-only"`.
- Новые зависимости — только с согласия владельца.
- Записи в БД из форм — через Server Actions с валидацией zod на сервере (паттерн из `src/lib/leads/`).
- Тексты интерфейса на русском живут в компонентах, сервер возвращает коды ошибок.
- Юридические тексты (политика, согласия) не писать и не менять.
- Перед тем как сказать «готово»: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` (то же гоняет CI).
