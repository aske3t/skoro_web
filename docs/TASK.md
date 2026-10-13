# TASK-003: доступ к БД, статический лендинг, навигация

> Архитектура: [architecture/CURRENT.md](architecture/CURRENT.md) (версия 2026-10-06, решения — §12), ADR [0001](architecture/adr/0001-branches-and-deploy.md)–[0004](architecture/adr/0004-pricing-single-source.md), аудит [db-security.md](architecture/db-security.md).
> Базовая ветка: `dev` (после влития `chore/foundation`). Рабочая ветка: `feature/static-landing`, запушить сразу.
> Решения зафиксированы. Если какое-то мешает, остановись и опиши проблему в PROPOSALS, не меняй его самостоятельно.

## 1. Зачем

1. **Чинит сломанное.**
   - форма нового заказа падает: `service_config` не читается (P-14);
   - главная кнопка Hero «Связаться с нами» — `type="submit"` вне формы, поэтому ничего не делает.
2. **Закрывает лишний доступ к БД.** У `anon` и `authenticated` полные права на запись во все таблицы, политики объявлены `to public`, RPC заказа доступна анонимно (P-20, частично P-16).
3. **Делает лендинг статическим** (P-06) и чистит навигацию (P-08).
4. **Обновляет `@supabase/ssr` и типизирует клиенты** (P-13). Работа с сессией в Navbar и middleware всё равно переписывается в этой задаче.
5. **Создаёт ветку `main`** по ADR-0001.

Блоки выполнять по порядку. Каждый блок — свои коммиты.

## 2. Предусловия

- [ ] `chore/foundation` влит в `dev` через PR, CI зелёный.
- [ ] `DB_URL` и `SUPABASE_ACCESS_TOKEN` доступны, как описано в STATE → «Как запустить».

## 3. Блок 0 — доступ к БД (P-14, P-20, P-16 частично)

### 3.1. Диагностика

Только `select`, результаты внести в отчёт:

```sql
select count(*) from public.service_config;
select count(*) from public.zone_distances;
select proacl from pg_proc where proname = 'create_order_for_user';
```

Если в `service_config` 0 строк, **спроси у владельца рабочие часы** и добавь в миграцию из п. 3.2:

```sql
insert into public.service_config (id, operating_start_minute, operating_end_minute)
values (1, <начало, минуты от полуночи>, <конец>) on conflict (id) do nothing;
```

### 3.2. Миграция `supabase/migrations/<ts>_harden_public_access.sql`

```sql
-- P-14: рабочие часы читают все (CURRENT §5)
create policy "read service_config"
  on public.service_config
  as permissive
  for select
  to anon, authenticated
  using (true);

-- P-20: запись в public — только сервер (ADR-0003). SELECT не трогаем.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger
  on tables from anon, authenticated;

-- P-20: явные роли вместо public
alter policy "read slots"          on public.delivery_slots to anon, authenticated;
alter policy "read retail_points"  on public.retail_points  to anon, authenticated;
alter policy "read skoro_pricing"  on public.skoro_pricing  to anon, authenticated;
alter policy "read zone_distances" on public.zone_distances to anon, authenticated;
alter policy "read zones"          on public.zones          to anon, authenticated;
alter policy "own orders"          on public.orders         to authenticated;
alter policy "own payments"        on public.payments       to authenticated;
alter policy "own profile"         on public.profiles       to authenticated;
alter policy "own subscriptions"   on public.subscriptions  to authenticated;

-- P-16 (частично): RPC заказа только для вошедших. Полностью внутренней она станет в TASK-005.
revoke execute on function public.create_order_for_user(text, text, uuid, timestamptz, text, text)
  from public, anon;
grant execute on function public.create_order_for_user(text, text, uuid, timestamptz, text, text)
  to authenticated;
```

**Перед коммитом** проверь, что из приложения никто не пишет в таблицы напрямую:

```bash
grep -rnE "\.(insert|update|upsert|delete)\(" src
```

Ожидается только код лидов (admin-клиент). Если найдётся что-то ещё — остановись и опиши находку.

### 3.3. Код

`src/app/dashboard/orders/new/page.tsx`: убрать `serviceRes.data!`. Если строки нет, показывать понятное сообщение вместо формы, например «Не удалось загрузить настройки сервиса, свяжитесь с нами» + телефон. Падать страница не должна.

### 3.4. Применение и проверка

Миграцию применяет **владелец**: `npx supabase db push --db-url "$DB_URL"`. После применения файл миграции не редактируется. Затем проверить:

- `npx supabase migration list --db-url "$DB_URL"` — синхронно;
- `npx supabase db diff --db-url "$DB_URL"` — пусто;
- REST с publishable key:
  - `GET /rest/v1/service_config` → 1 строка;
  - `POST /rest/v1/zones` → отказ (`permission denied`);
  - `POST /rest/v1/rpc/create_order_for_user` без сессии → отказ;
- вручную: `/dashboard/orders/new` открывается, тестовый заказ создаётся и появляется в «Заказах».

## 4. Блок 1 — Supabase-библиотеки и типизация (P-13)

1. `@supabase/ssr` → `^0.12.7`, `@supabase/supabase-js` → актуальная 2.x (≥ 2.114, peer-зависимость ssr). Отдельным коммитом, до типизации.
2. Сверить API cookies в `lib/supabase/server.ts` и `lib/supabase/middleware.ts` с актуальной документацией ssr (`getAll`/`setAll`). Поведение не менять.
3. `<Database>` на всех клиентах: `client.ts`, `server.ts`, `admin.ts`, клиент в middleware.
4. `createOrder.ts`: `p_comment: comment || undefined` вместо `null`. Это настоящая ошибка, которую поймала типизация.
5. Если новой версии нужна другая форма хелперов в `database.ts`, перегенерировать типы через `--db-url` по процедуре из `CLAUDE.md`.
6. `tsc --noEmit` проходит **без** `as any` и `@ts-ignore` в коде Supabase-клиентов и запросов.

## 5. Блок 2 — статический лендинг (P-06)

1. **Корневой layout и `Navbar` не обращаются к Supabase на сервере.** Удалить серверный `createClient()` / `getUser()` из `Navbar.tsx`. Либо оставить `Navbar` тонкой серверной обёрткой без данных, либо подключать `NavbarClient` напрямую.
2. **`NavbarClient` сам определяет статус входа** через browser-клиент:
   - при монтировании `supabase.auth.getSession()` — это локальное чтение, без сети;
   - подписка `onAuthStateChange`, отписка при размонтировании;
   - три состояния: `unknown` / `in` / `out`. В состоянии `unknown` кнопка «Войти/Кабинет» занимает своё место невидимым плейсхолдером того же размера, чтобы не было сдвига вёрстки;
   - если `NEXT_PUBLIC_SUPABASE_*` не заданы, клиент не создавать, состояние `out`, без исключений (правило ленивых env, CURRENT §2).

   Это только UI-индикация. Защита ЛК остаётся в `dashboard/layout.tsx` (`getUser()` на сервере), её не трогать.
3. **`middleware.ts`:** matcher — `["/dashboard/:path*", "/login", "/auth/:path*"]`.
4. **`layout.tsx`:** убрать неиспользуемые шрифты (предупреждения ESLint).
5. **Проверить вывод `npm run build`:**
   - `/` помечен `○` (Static);
   - если остался `ƒ`, найти причину (`cookies()`, `headers()`, `searchParams` в дереве `/`) и устранить, не меняя поведения.

## 6. Блок 3 — навигация (P-08)

1. **`NavbarClient`:** убрать ссылку `/personal` и логику `audience` / `pathname.startsWith("/personal")` в десктопной и мобильной версиях.
2. **`app/dashboard/subscribition/` → `app/dashboard/subscription/`:**
   - ссылка в `DashboardTabs.tsx`;
   - редирект в `next.config.ts`: `{ source: "/dashboard/subscribition", destination: "/dashboard/subscription", permanent: true }`;
   - `grep -rn subscribition src` после правки пуст.
3. **`HeroTracking.tsx`:**
   - удалить закомментированную форму трекинга, состояние `trackingNumber`, `onSubmit` и `useRouter`;
   - кнопку «Связаться с нами» сделать ссылкой на `#contact` (`<Link>` или `<a>`) с теми же классами. Визуально ничего не меняется.
4. **`WhySkoro.tsx`:** убрать неиспользуемый импорт `ShieldCheck`.
5. **После блоков 2–3** предупреждения ESLint остаются только в `Calculator.tsx` (это TASK-004).

## 7. Блок 4 — ветка `main` (ADR-0001)

**Агент:**

```bash
git branch main ec05ede
git tag prod-2026-05-17 ec05ede
git push origin main prod-2026-05-17
```

**Владелец** (агент выводит этот список и ждёт подтверждения):

1. Vercel → Settings → Git:
   - Production Branch = `main`;
   - проверить, что env заданы для Production и Preview;
   - Node.js Version = 22.x.

   Vercel пересоберёт прод из `ec05ede`. Это тот же код, что сейчас на сайте. Если сборка упадёт, текущая версия сайта останется.
2. GitHub → Settings:
   - Default branch = `main`;
   - Branches → защита для `dev` и `main`: merge только через PR, обязательная проверка CI (`check`).

**Агент — после подтверждения владельца:**

```bash
git push origin --delete master variant1
```

Также удалить локальные копии этих веток.

## 8. Ограничения

- **БД:** только миграция из п. 3.2. Применяет владелец. Тело `create_order_for_user`, defaults и FK не менять (TASK-005).
- **Не трогать:**
  - калькулятор, цены, `Tariffs`, `Abons` (TASK-004);
  - логику формы заказа, кроме защиты из п. 3.3 (TASK-005).
- **Новые и обновлённые зависимости:** только `@supabase/ssr` и `@supabase/supabase-js`. Мажорные обновления Next и Tailwind запрещены.
- **Дизайн и тексты** лендинга не менять, кроме п. 6.3. Юридические тексты не трогать.

## 9. Критерии приёмки

**Агент (локально и в CI):**

- [ ] `tsc --noEmit`, `lint` (предупреждения только в `Calculator.tsx`), `test`, `build` проходят; CI на PR зелёный.
- [ ] В выводе `build` `/` помечен `○`.
- [ ] `/` отдаёт 200 при незаданных `NEXT_PUBLIC_SUPABASE_*`; Navbar показывает «Войти».
- [ ] `grep -rn "subscribition\|/personal\|/tracking" src` — пусто, кроме источника редиректа.
- [ ] Клиенты Supabase типизированы `<Database>`, без `any` и `@ts-ignore` в запросах.

**Владелец (на Vercel Preview ветки и после применения миграции):**

- [ ] REST-проверки из п. 3.4 проходят.
- [ ] Вход → в Navbar «Кабинет»; выход → «Войти»; при загрузке нет сдвига вёрстки.
- [ ] `/dashboard` без входа редиректит на `/login`.
- [ ] Новый заказ создаётся и виден в «Заказах».
- [ ] `/dashboard/subscribition` перенаправляет на `/dashboard/subscription`.
- [ ] Кнопка «Связаться с нами» в Hero прокручивает к форме.
- [ ] После блока 4 Vercel показывает Production Branch `main`, сайт работает.

## 10. Отчёт

1. Коммиты и изменённые файлы по блокам.
2. Результаты диагностики из п. 3.1.
3. Отклонения от задачи и их причины.
4. Что осталось владельцу: применение миграции, настройки Vercel и GitHub, подтверждение для удаления веток.
