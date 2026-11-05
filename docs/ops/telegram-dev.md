# Dev-боты и Preview: настройка для пилота

> Для владельца. Шаг 0 из [плана пилота](../tasks/bot-client-pilot.md), решения — [ADR-0006 §8](../architecture/adr/0006-client-options-and-bot-orders.md).
> Сверено 2026-11-05 с документацией Vercel (Protection Bypass for Automation, адреса веток, переменные окружения) и Telegram Bot API.

**Итог:** два тестовых бота работают с Preview ветки `feature/bot-clients`, тестовые заявки идут в отдельную группу, а боевой бот остаётся нетронутым.

**Секреты** (токены, секрет обхода, секреты вебхуков) не присылай в чат и не коммить.

## Сейчас: только dev-клиентский бот

Решение владельца (2026-11-05): dev-служебного бота пока не заводим. Боевой служебный бот не меняется, на Preview его значений нет.

**Что пропустить сейчас:**
- п. 1 — dev-служебного бота;
- п. 2 — тестовую группу целиком;
- п. 5 — секрет для `TELEGRAM_WEBHOOK_SECRET`;
- п. 6 — строки `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ADMIN_IDS` и `APP_URL` для Production: сайт его пока не читает, завести на шаге 6 вместе с клиентскими переменными;
- п. 9 и п. 10 — всё про `--bot service` и тестовую заявку.

**Что учесть:**
- Все команды — только с `--bot client`. Без параметра скрипт работает со служебным ботом, а он сейчас боевой.
- Боевые значения `TELEGRAM_*` служебного бота на Preview не заводи. Пока их там нет, заявки с Preview сохраняются в общую БД, но в Telegram не приходят, а `/api/telegram/dispatch` отвечает 401.
- **К шагу 2 dev-служебный бот нужен.** Без него на Preview не увидеть заявку в Telegram (шаг 2), `/invite` и кнопки заказов (шаги 3–5). Боевой токен здесь не поможет: его вебхук стоит на проде, и нажатия обрабатывал бы код из `main`. Когда заведёшь бота, пройди пропущенные пункты: боевого бота это не затронет.

## 1. Два dev-бота

В @BotFather для каждого: `/newbot`, имя, username (должен оканчиваться на `bot`). Токены сохрани.

| Бот | Пример имени | Настройка |
|---|---|---|
| dev-служебный | Skoro Service DEV | не нужна |
| dev-клиентский | Skoro Client DEV | `/setjoingroups` → выбрать бота → **Disable** |

## 2. Тестовая группа

1. Создай группу «Skoro · Заявки DEV» и добавь в неё dev-служебного бота. Если меняешь настройки группы (например, историю сообщений), сделай это сейчас: Telegram может сменить ID группы.
2. Напиши в группе `/start@<username dev-служебного бота>`.
3. Узнай ID группы. Вебхук этого бота на этот момент ещё не поставлен, иначе `getUpdates` вернёт ошибку:

   ```bash
   read -s BOT_TOKEN   # вставь токен dev-служебного бота, Enter
   curl -s "https://api.telegram.org/bot$BOT_TOKEN/getUpdates" | grep -o '"chat":{"id":-[0-9]*'
   unset BOT_TOKEN
   ```

   Число со знаком минус — это `TELEGRAM_CHAT_ID`. Если вывод пустой, напиши команду в группе ещё раз.

## 3. Секрет обхода защиты Preview

Vercel → проект `skoro-web-st78` → **Settings → Deployment Protection → Protection Bypass for Automation** → создай секрет и скопируй его. Он даст Telegram пройти защиту Preview.

## 4. Адрес ветки

Vercel → **Deployments** → последняя сборка ветки `feature/bot-clients` → адрес вида `skoro-web-st78-git-feature-bot-clients-….vercel.app`. Этот адрес не меняется от коммита к коммиту. Копируй его из Vercel, а не собирай вручную: длинные адреса Vercel сокращает.

Собери из него `APP_URL`:

```
https://<адрес ветки>?x-vercel-protection-bypass=<секрет обхода>&x-vercel-set-bypass-cookie=samesitenone
```

Второй параметр понадобится Mini App на шаге 4. В адрес вебхука скрипт возьмёт только первый.

## 5. Секреты вебхуков

Сгенерируй два **разных** значения:

```bash
openssl rand -hex 32   # для TELEGRAM_WEBHOOK_SECRET
openssl rand -hex 32   # для TELEGRAM_CLIENT_WEBHOOK_SECRET
```

## 6. Переменные в Vercel

Vercel → **Settings → Environment Variables**.

> ⚠️ **Не меняй значение записи, которая действует сразу на Production и Preview: это изменит прод при следующей сборке.** Если `TELEGRAM_*` заведены одной записью на оба окружения, оставь в ней боевое значение и только Production, а для Preview создай новую запись.

| Переменная | Окружение | Значение | Тип |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Preview | токен dev-служебного бота | Secret |
| `TELEGRAM_CHAT_ID` | Preview | ID группы из п. 2 | Config |
| `TELEGRAM_WEBHOOK_SECRET` | Preview | первый секрет из п. 5 | Secret |
| `TELEGRAM_ADMIN_IDS` | Preview | как в проде | Config |
| `TELEGRAM_CLIENT_BOT_TOKEN` | Preview | токен dev-клиентского бота | Secret |
| `TELEGRAM_CLIENT_WEBHOOK_SECRET` | Preview | второй секрет из п. 5 | Secret |
| `TELEGRAM_CLIENT_BOT_USERNAME` | Preview | username dev-клиентского бота, без `@` | Config |
| `APP_URL` | Preview, **только ветка `feature/bot-clients`** | значение из п. 4 | Secret |
| `APP_URL` | Production | `https://skorouvas.cz` | Config |

Остальные клиентские переменные в Production заводятся на шаге 6, с боевым клиентским ботом.

**Что меняется:** Preview всех веток, включая `dev` и кабинет, начинает работать с dev-ботами. Заявки с них пойдут в группу DEV, а не в боевую.

## 7. `.env.local` в папке `skoro-bot`

Запиши туда те же значения, что на Preview. `APP_URL` — в кавычках:

```
APP_URL="https://<адрес ветки>?x-vercel-protection-bypass=<секрет обхода>&x-vercel-set-bypass-cookie=samesitenone"
```

⚠️ Когда появится dev-служебный бот, в `skoro-bot/.env.local` не должно остаться боевого токена. `.env.local` в основной папке `skoro` не меняй.

## 8. Redeploy

Vercel → **Deployments** → последняя сборка `feature/bot-clients` → **Redeploy**. Новые переменные действуют только на новые сборки.

В окне Redeploy должна быть указана ветка `feature/bot-clients`. Если там `main`, нажми **Cancel**: в той сборке нет нового маршрута.

## 9. Вебхуки dev-ботов

Все команды — из папки `skoro-bot`. Сначала проверь, что под токенами именно dev-боты:

```bash
npm run bot:webhook -- --bot service --info
npm run bot:webhook -- --bot client --info
```

`--info` только читает. Если в строке `Бот:` видишь боевого бота, останови настройку и исправь `.env.local`.

Затем поставь вебхуки и снова посмотри их состояние:

```bash
npm run bot:webhook -- --bot service
npm run bot:webhook -- --bot client
npm run bot:commands -- --bot client
```

Если бот уже стоит на `skorouvas.cz`, скрипт откажется уводить его оттуда: значит, в `.env.local` боевой токен. Не добавляй `--force`, исправь токен.

## 10. Проверка

1. **Клиентский бот:** `/start` в личке отвечает «Бот Skoro для клиентов».
2. **Служебный бот:** `/start` в личке отвечает приветствием.
3. **Состояние:** `--info` у обоих dev-ботов показывает адрес ветки и `Последняя ошибка: нет`.
4. **Заявка:** отправь с адреса ветки тестовую заявку на доставку. Она должна прийти в группу DEV, кнопки должны работать.
   - Заявка ляжет в общую с продом БД.
   - При «Взял в работу» письмо уйдёт на адрес из заявки, поэтому указывай свой email.
5. **Боевой бот не тронут.** Посмотри его состояние из папки `skoro`:

   ```bash
   cd ../skoro
   node --env-file-if-exists=.env.local --conditions=react-server ../skoro-bot/scripts/telegram-set-webhook.mts --info
   cd -
   ```

   Ожидается боевой бот и адрес `https://skorouvas.cz/api/telegram/dispatch`. Старая ошибка с прошлой датой не страшна. Если дата свежая, напиши агенту.

   ⚠️ Не запускай в папке `skoro` команду `npm run bot:webhook -- --info`: там может быть старая версия скрипта. Она не знает `--info`, заново поставит вебхук и сбросит очередь обновлений.

## Если что-то не так

Текст ошибки — в `Последняя ошибка` у `--info`.

| Ошибка | Вероятная причина | Что делать |
|---|---|---|
| `Wrong response from the webhook: 401 Unauthorized` | Секрет вебхука в `.env.local` и в Vercel различается, или после записи переменных не было Redeploy | Сверь значения, Redeploy, снова поставь вебхук |
| `… 30x` (редирект, обычно `302`) | Telegram упёрся в защиту Vercel: секрет обхода в `APP_URL` неверный или не задан | Сверь секрет с Vercel, снова поставь вебхук |
| `… 404 Not Found` | Сборка ветки без нужного маршрута или неверный адрес | Проверь адрес, Redeploy |
| `… 500 Internal Server Error` | Неверный токен в Preview | Перезапиши токен, Redeploy |

Бот молчит, а ошибки нет: посмотри логи функции в Vercel → сборка → **Logs**.

## Откат и локальная разработка

- **Снять вебхук dev-бота:** `npm run bot:webhook -- --bot client --delete` (или `--bot service`).
- **Локальный polling:** сначала сними вебхук этого бота, затем `npm run bot:dev -- --bot client`. После работы поставь вебхук обратно.
- **Отменить настройку Preview:** удали записи Preview из п. 6 и сделай Redeploy. Боевых значений это не касается.
