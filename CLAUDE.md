# CLAUDE.md — правила работы в проекте Skoro

Сайт курьерской службы Skoro (Брно): лендинг с калькулятором доставки, контактная форма (лиды) и личный кабинет клиента.
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
npx tsc --noEmit
```

Генерация типов БД — только через временный файл (`>` обнуляет цель, если команда упала):

```bash
npx supabase gen types typescript --project-id ukdxpdprxkcslydfobno > /tmp/db.ts && mv /tmp/db.ts src/types/database.ts
```

## Структура

- `src/app/` — маршруты: `/`, `/login`, `/dashboard/*`, route handlers `auth/*`, `api/geocode/search`.
- `src/components/` — `sections/` (лендинг), `calculator/`, `account/` (ЛК), `layout/`, `ui/`.
- `src/lib/` — `supabase/` (клиенты: browser, server, middleware, `admin.ts` server-only), `leads/` (контактная форма), `calculator/`, `account/`, `maps/`.
- `src/types/database.ts` — сгенерированные типы Supabase.
- `supabase/migrations/` — миграции схемы (пока только `create_leads`, остальная схема живёт только в удалённой БД).

## Правила для агента

- Работа в `feature/*` от `dev`. Коммиты мелкие и осмысленные, с кодом коммить и изменения `docs/`.
- Не применять миграции к удалённой БД (`supabase db push`, `db reset`, `migration up`). Миграции применяет владелец.
- Секреты не выводить и не коммитить. `.env.local` не трогать. Серверные ключи — без префикса `NEXT_PUBLIC_`, читаются лениво и только в модулях с `import "server-only"`.
- Новые зависимости — только с согласия владельца.
- Записи в БД из форм — через Server Actions с валидацией zod на сервере (паттерн из `src/lib/leads/`).
- Тексты интерфейса на русском живут в компонентах, сервер возвращает коды ошибок.
- Юридические тексты (политика, согласия) не писать и не менять.
- Перед тем как сказать «готово»: `npx tsc --noEmit`, `npm test`, `npm run build`.
