# Служебный Telegram-бот Skoro

> Живой документ: обновляется после каждого шага. Ведёт агент.
> Архитектурные решения — зафиксированы владельцем в задаче (не в ADR); при противоречии с ADR/CURRENT — вопрос в [PROPOSALS.md](architecture/PROPOSALS.md).

## Что это

Один бот (`TELEGRAM_BOT_TOKEN`), который:
- уже шлёт уведомления о новых заявках с сайта в группу «Заявки» (`src/lib/leads/notify.ts`, без изменений в этой работе);
- теперь также принимает входящие обновления (команды, нажатия кнопок) для диспетчера и курьеров.

Клиентский бот (для получателей доставки) — отдельная, более поздняя задача.

Живёт внутри Next.js: нет отдельного процесса/сервера. Входящие обновления обрабатывает
Route Handler `POST /api/telegram/dispatch` (runtime `nodejs`), вызывая grammY `webhookCallback`.

## Код

| Файл | Назначение |
|---|---|
| `src/lib/telegram/bot.ts` | `createBot()` — собирает `Bot` из `grammy`, регистрирует команды. Токен читается лениво из `TELEGRAM_BOT_TOKEN` |
| `src/lib/telegram/commands.ts` | Тексты и хендлеры `/start`, `/help`, `/orders` |
| `src/lib/telegram/webhook-secret.ts` | `isValidWebhookSecret()` — сравнение `X-Telegram-Bot-Api-Secret-Token` за постоянное время (чистая функция, тест рядом) |
| `src/lib/telegram/webhook-guard.ts` | `isWebhookConfigured()` — проверка для `bot:dev`, не даёт polling перехватить прод (чистая функция, тест рядом) |
| `src/app/api/telegram/dispatch/route.ts` | Route handler вебхука: проверка секрета → `webhookCallback(bot, "std/http")` |
| `scripts/telegram-bot-dev.ts` | `npm run bot:dev` — long polling для локальной разработки |
| `scripts/telegram-bot-commands.ts` | `npm run bot:commands` — `setMyCommands` |

**Важно про импорты.** Скрипты `bot:dev`/`bot:commands` запускаются как обычный `node`, без
бандлера Next.js — он не умеет резолвить алиас `@/*` и расширения `.ts` автоматически. Поэтому
внутри `src/lib/telegram/**` относительные импорты между файлами модуля пишутся с явным
расширением (`"./commands.ts"`), а не через алиас `@/...`. Это разрешено флагом
`allowImportingTsExtensions` в `tsconfig.json` (безопасно, так как `noEmit: true`). Route handler
собирается Next.js и может использовать `@/lib/telegram/bot` как обычно.

## Команды бота (сейчас)

| Команда | Кто | Что делает |
|---|---|---|
| `/start` | любой | приветствие |
| `/help` | любой | список команд |
| `/orders` | любой | заглушка: «Список заказов появится позже» |

Прав пока ни на что не проверяем: действий, которые что-то меняют, в боте ещё нет.

## Переменные окружения

| Переменная | Где читается | Назначение |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `bot.ts` | уже используется для уведомлений о лидах; теперь и для приёма обновлений |
| `TELEGRAM_CHAT_ID` | `notify.ts` | группа «Заявки» (без изменений) |
| `TELEGRAM_WEBHOOK_SECRET` | `route.ts` | секрет для `X-Telegram-Bot-Api-Secret-Token`; при установке вебхука передаётся в `setWebhook` |
| `TELEGRAM_ADMIN_IDS` | — (пока не используется) | появится в шаге 2: Telegram user id диспетчера(ов), через запятую |

Читаются лениво, без `NEXT_PUBLIC_`. Владельцу нужно завести `TELEGRAM_WEBHOOK_SECRET` и
`TELEGRAM_ADMIN_IDS` в Vercel (Production и Preview) — значения см. в задаче/у агента, в
документы и коммиты секреты не попадают.

## Локальная разработка (long polling)

```bash
npm run bot:dev
```

Скрипт сначала проверяет `getWebhookInfo()`: если на боте уже стоит вебхук — откажется
стартовать (polling снял бы вебхук и перехватил обновления у прода). В этом случае нужен
отдельный dev-бот (свой токен у @BotFather) — предупредить владельца заранее.

Обновить меню команд в Telegram (`/`):

```bash
npm run bot:commands
```

## Вебхук (после релиза в `main`)

Не настроено в этом шаге. Будет: отдельный скрипт `setWebhook` на
`https://skorouvas.cz/api/telegram/dispatch` с `secret_token` и `allowed_updates`, после того как
`dev` → `main`. Preview-адреса Vercel закрыты авторизацией, Telegram до них не достучится — вебхук
только на прод-домен.

## История шагов

- **Шаг 1 (2026-10-14).** Каркас: `grammy`, `bot.ts`, route handler с проверкой секрета,
  `bot:dev`/`bot:commands`, команды `/start`, `/help`, `/orders`. Без БД, без прав — они появятся
  в шаге 2 (кнопки под заявкой) и шаге 3 (регистрация курьеров).
