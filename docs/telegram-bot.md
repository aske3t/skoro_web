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
| `src/lib/telegram/callback-data.ts` | Сборка и разбор `callback_data` вида `lead:<take\|spam>:<uuid>` (≤ 64 байт) |
| `src/lib/telegram/permissions.ts` | `isAdmin` / `isAdminFromEnv` — проверка по `TELEGRAM_ADMIN_IDS` |
| `src/lib/telegram/lead-keyboard.ts` | Кнопки под заявкой (используются в `notify.ts`) |
| `src/lib/telegram/lead-message.ts` | `displayName`, `formatHandledNote` — строка «кто и когда обработал» |
| `src/lib/telegram/lead-actions.ts` | `applyLeadAction` — условный `update … where status = 'new'` через admin-клиент |
| `src/lib/telegram/lead-callbacks.ts` | Хендлер `callback_query`: права → действие → `answerCallbackQuery` → правка сообщения |
| `src/lib/html.ts` | `escapeHtml` — общий хелпер для `parse_mode: HTML` |
| `scripts/telegram-bot-dev.mts` | `npm run bot:dev` — long polling для локальной разработки |
| `scripts/telegram-bot-commands.mts` | `npm run bot:commands` — `setMyCommands` |

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

Команды доступны всем и ничего не меняют.

## Кнопки под заявкой

Уведомление о заявке с сайта уходит в группу (`TELEGRAM_CHAT_ID`). В заголовке указан тип: «Доставка» или «Вопрос». Две кнопки есть **только у заявок на доставку** (`kind = delivery`); вопросы приходят без кнопок.

| Кнопка | `callback_data` | `leads.status` | Кто |
|---|---|---|---|
| ✅ Взял в работу | `lead:take:<uuid>` | `in_progress` | только админ |
| 🚫 Спам | `lead:spam:<uuid>` | `spam` | только админ |

Сценарий:
1. Нажимает админ (`TELEGRAM_ADMIN_IDS`), заявка в статусе `new` → пишутся `status`, `handled_by_tg_id`, `handled_by_name`, `handled_at`; сообщение пересобирается из БД, внизу строка «✅ Взял в работу: Имя · дата, время» (Europe/Prague), кнопки убираются.
2. Нажимает не админ → всплывающее окно «доступно только администраторам», ничего не меняется.
3. Заявка уже не `new` (повторное нажатие, второй админ, повтор update от Telegram) → всплывающее окно «уже обработал(а): Имя», ничего не меняется.
4. Заявки, отправленные до этого шага, кнопок не имеют.

Идемпотентность — условный `update … where status = 'new'`, состояния в памяти нет.
На каждый `callback_query` вызывается `answerCallbackQuery`. Права проверяются на каждое нажатие: кнопку в группе видит любой участник.

Миграция: `20261014103738_leads_handled_by.sql` (nullable-колонки в `leads`).

## Переменные окружения

| Переменная | Где читается | Назначение |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `bot.ts` | уже используется для уведомлений о лидах; теперь и для приёма обновлений |
| `TELEGRAM_CHAT_ID` | `notify.ts` | группа «Заявки» (без изменений) |
| `TELEGRAM_WEBHOOK_SECRET` | `route.ts` | секрет для `X-Telegram-Bot-Api-Secret-Token`; при установке вебхука передаётся в `setWebhook` |
| `TELEGRAM_ADMIN_IDS` | `permissions.ts` | Telegram user id админов через запятую; кто может нажимать кнопки. Свой id — у @userinfobot или в `from.id` ответа `getUpdates` |

Читаются лениво, без `NEXT_PUBLIC_`. Владельцу нужно завести `TELEGRAM_WEBHOOK_SECRET` и
`TELEGRAM_ADMIN_IDS` в Vercel (Production и Preview) — значения см. в задаче/у агента, в
документы и коммиты секреты не попадают.

## Локальная разработка (long polling)

```bash
npm run bot:dev
```

Для проверки кнопок запустите **два процесса**: `npm run dev` (сайт, отправляет заявку) и
`npm run bot:dev` (принимает нажатия). Polling слушает `message` и `callback_query`.

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
- **Шаг 2 (2026-10-15).** Кнопки «Взял в работу» / «Спам» под заявкой, только для админов.
  Миграция `leads_handled_by`, `escapeHtml` вынесен в `src/lib/html.ts`, `formatLeadMessage`
  принимает необязательную `note`. Тесты: `callback_data`, права, форматирование.
