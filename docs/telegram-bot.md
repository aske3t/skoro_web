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

Уведомление о заявке с сайта уходит в группу (`TELEGRAM_CHAT_ID`). В заголовке указан тип: «Доставка» или «Вопрос». Для доставки в сообщении есть адрес забора, адрес доставки, телефон получателя и способ оплаты; фото, если оно приложено, приходит следующим сообщением — ответом на заявку (`sendPhoto`, `file_id` не сохраняется). Две кнопки есть **только у заявок на доставку** (`kind = delivery`); вопросы приходят без кнопок.

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
| `RESEND_API_KEY` | `email/resend.ts` | ключ Resend (Sending access, домен `notify.skorouvas.cz`) |
| `EMAIL_FROM` | `email/resend.ts` | `SKORO u vás <noreply@notify.skorouvas.cz>` |
| `EMAIL_REPLY_TO` | `email/resend.ts` | `skorodelivery@gmail.com` — куда приходят ответы клиентов |
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

`npm run bot:webhook` (`scripts/telegram-set-webhook.mts`) ставит вебхук на
`https://skorouvas.cz/api/telegram/dispatch` с `secret_token` и `allowed_updates: message, callback_query`,
сбрасывает накопившиеся обновления и печатает `getWebhookInfo`. Preview-адреса Vercel закрыты
авторизацией, Telegram до них не достучится — вебхук только на прод-домен.

- Секрет берётся из `TELEGRAM_WEBHOOK_SECRET` окружения (переменная окружения важнее `.env.local`)
  и должен совпадать со значением в Vercel (Production), иначе route отвечает 401.
- `npm run bot:webhook -- --delete` снимает вебхук (откат; после этого снова работает `bot:dev`).
- Пока вебхук стоит, `bot:dev` откажется стартовать — так задумано.

## История шагов

- **Шаг 1 (2026-10-14).** Каркас: `grammy`, `bot.ts`, route handler с проверкой секрета,
  `bot:dev`/`bot:commands`, команды `/start`, `/help`, `/orders`. Без БД, без прав — они появятся
  в шаге 2 (кнопки под заявкой) и шаге 3 (регистрация курьеров).
- **Шаг 2 (2026-10-15).** Кнопки «Взял в работу» / «Спам» под заявкой, только для админов.
  Миграция `leads_handled_by`, `escapeHtml` вынесен в `src/lib/html.ts`, `formatLeadMessage`
  принимает необязательную `note`. Тесты: `callback_data`, права, форматирование.
- **Форма доставки (2026-10-16).** Поля: адрес забора и доставки (обязательно), телефон
  клиента (для доставки обязателен), телефон получателя (необязательно), способ оплаты
  «Наличные» / «Оплата на сайте» (обязательно; онлайн-оплаты нет, это только отметка до TASK-006),
  фото отправления (необязательно, JPG/PNG/WebP до 4 МБ, тип по байтам, уходит в Telegram через
  `sendPhoto`). Миграция `20261016122134_leads_delivery_details`. В `next.config.ts` лимит
  Server Actions поднят до 5 МБ. Письмо клиенту о принятии заявки — следующий шаг (P-29).
- **Фото: буфер обмена и мобильные (2026-10-20).** `PhotoField`: выбор из галереи или камеры
  (без `capture`), перетаскивание, вставка Cmd/Ctrl+V в любом месте формы. В браузере фото
  уменьшается до 2048 px по длинной стороне и перекодируется в JPEG 0,85 (`photo-client.ts`,
  canvas, без зависимостей); EXIF, включая GPS, отбрасывается. Исходник — до 20 МБ, на сервер
  уходит до 4 МБ. Пока фото обрабатывается, отправка заблокирована. Без JS — обычный файл до 4 МБ.
- **Письмо клиенту (2026-10-21).** При «✅ Взял в работу» у заявки на доставку бот отправляет
  клиенту письмо через Resend (`src/lib/email/`, HTTP API без SDK): «objednávka č. XXXXXXXX
  převzal kurýr», краткое описание доставки, телефон поддержки. Только чешский: языковых версий
  сайта пока нет; новые языки — в `TEMPLATES` (`lead-taken.ts`). Номер — первые 8 символов uuid.
  Под заявкой в группе появляется «📧 Письмо клиенту отправлено» или «⚠️ … не отправлено».
  Повтор исключён условным update и `Idempotency-Key: lead-taken/<id>`. Сбой письма не откатывает
  статус. Отправка с субдомена `notify.skorouvas.cz` (DKIM/SPF в Resend), ответы — на Gmail (P-29).
- **Номер заявки и оформление письма (2026-10-21).** Миграция `20261020235139_leads_number`:
  порядковый `leads.number` с 0 (nullable-колонка + последовательность `leads_number_seq`;
  identity не подходит — она всегда NOT NULL, а ADR-0002 разрешает только nullable). Старые заявки
  пронумерованы по `created_at`. Номер — в заголовке Telegram («Новая заявка №12 · Доставка»)
  и в письме. Письмо — тёмная карточка в цветах сайта (`#1f1526`, акцент `#b895ff`), кнопка
  «Zavolat», логотип внизу. Логотип встроен в письмо inline-вложением (`cid:skoro-logo`,
  `src/lib/email/logo.ts`, PNG 440 px из `public/images/home/skoro_cropped.png`), поэтому
  не зависит от прода.
- **Надёжность письма (2026-10-21, P-30).** `leads.client_notified_at` (миграция
  `20261021005207`) хранит факт отправки. Если письмо не ушло — под заявкой «⚠️ Письмо клиенту
  не отправлено» и кнопка «📧 Отправить письмо повторно» (`lead:email:<uuid>`, только админы).
  Повторное нажатие «Взял в работу» на взятую заявку без письма тоже досылает его. Ответ на
  устаревшее нажатие (бот был выключен) больше не прерывает обработку; `bot.catch` не даёт
  ошибке остановить бота.
