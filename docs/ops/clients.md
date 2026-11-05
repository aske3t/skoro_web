# Клиенты: SQL-сниппеты для владельца

> Клиентов заводит владелец (ADR-0006 §1). Сниппеты выполняются в Supabase → SQL Editor.
> ⚠️ Репозиторий публичный: реальные данные клиентов подставляй только в SQL Editor и не сохраняй в этом файле.
> ⚠️ База общая для прода и Preview: изменения действуют сразу.

Выполняй по одному блоку: SQL Editor показывает результат только последнего запроса. `id` из ответа нужен в следующих блоках.

## 1. Клиент

**Компания** (IČO — 8 цифр, обязательно):

```sql
insert into public.clients (type, name, ico, email, phone, default_payment_method, status)
values ('company', '<название>', '<ico>', '<email>', '<телефон>', 'invoice', 'active')
returning id;
```

**Частное лицо:**

```sql
insert into public.clients (type, name, email, phone, default_payment_method, status)
values ('person', '<название>', '<email>', '<телефон>', 'cash', 'active')
returning id;
```

- `default_payment_method`: `invoice` (счёт) или `cash` (наличные). Клиент видит его в форме, но не меняет.
- `status`: `active` — может заказывать, `blocked` — заблокирован. Если не указать, будет `pending`, и заказывать клиент не сможет.
- Телефон — в формате `+420777123456`. Необязательные `email` и `phone` можно убрать из обоих списков.

## 2. Контакт — человек, который заказывает

Вход в клиентский бот идёт через контакт. Для теста контактом клиента 1 можно указать себя.

```sql
insert into public.client_contacts (client_id, name, phone, email)
values ('<client_id>', '<имя>', '<телефон>', '<email>')
returning id;
```

На `email` контакта придут письма о статусах заказа: без него клиент получит только сообщения в боте.

## 3. Точка клиента

Необязательно. Нужна, если клиент забирает отправления из постоянного места или цена зависит от точки.

```sql
insert into public.client_locations (client_id, name, address, contact_name, contact_phone)
values ('<client_id>', '<название точки>', '<адрес>', '<имя на точке>', '<телефон>')
returning id;
```

## 4. Подключить «Доставку по городу»

Тариф `slot_table`: цена по слотам. Слаги слотов: `express`, `slot_3h`, `slot_day`. Цены ниже — пример.

```sql
insert into public.client_options (client_id, option_id, tariff_kind, tariff_params)
select '<client_id>'::uuid, id, 'slot_table',
  '{"default": {"express": 220, "slot_3h": 170, "slot_day": 140}}'::jsonb
from public.service_options
where slug = 'city_delivery'
returning id;
```

Цена ищется так: точка × слот → `default` × слот → базовая цена слота из `delivery_slots`. Поэтому слот можно не указывать: тогда действует базовая цена.

**Одна цена на все слоты** (фикс для партнёра): в том же запросе замени `'slot_table'` на `'flat'`, а JSON на `'{"price": 200}'::jsonb`. Рабочие часы и прошедшее время проверяются так же.

**Своя цена на точке** (`byLocation`, необязательно):

```sql
update public.client_options
set tariff_params = '{
  "default": {"express": 220, "slot_3h": 170, "slot_day": 140},
  "byLocation": {"<location_id>": {"express": 200}}
}'::jsonb
where client_id = '<client_id>'
  and option_id = (select id from public.service_options where slug = 'city_delivery');
```

**Фиксированная точка забора** (предзаполнение формы, необязательно):

```sql
update public.client_options
set form_defaults = '{"pickupLocationId": "<location_id>"}'::jsonb
where client_id = '<client_id>'
  and option_id = (select id from public.service_options where slug = 'city_delivery');
```

**Если тариф заполнен с ошибкой**, заказ не создаётся: клиент видит понятную ошибку, а админ получает сообщение. Ошибка — это опечатка в ключе (`by_location`), неизвестный слаг слота (`expres`), цена текстом или отрицательная цена.

## 5. Уникальная опция клиента

Пример: услуга только для одного клиента с одной ценой (тариф `flat`). Форма — та же `city_delivery`. Другому клиенту такую опцию база подключить не даст.

```sql
insert into public.service_options (slug, name, description, form_kind, client_id)
values ('<slug_латиницей>', '<название услуги>', '<описание>', 'city_delivery', '<client_id>')
returning id;
```

```sql
insert into public.client_options (client_id, option_id, tariff_kind, tariff_params)
values ('<client_id>', '<option_id>', 'flat', '{"price": 500}'::jsonb)
returning id;
```

## 6. Что видит клиент

**Опции и тарифы.** `available = true` — опция видна в боте:

```sql
select coalesce(co.custom_name, so.name) as option,
       co.active and so.active and c.status = 'active' as available,
       c.status as client_status,
       so.form_kind,
       co.tariff_kind,
       co.tariff_params,
       co.form_defaults
from public.client_options co
join public.service_options so on so.id = co.option_id
join public.clients c on c.id = co.client_id
where co.client_id = '<client_id>'
order by co.display_order, so.display_order;
```

**Контакты и точки:**

```sql
select 'контакт' as kind, name, status as details, telegram_user_id is not null as telegram_linked
from public.client_contacts
where client_id = '<client_id>'
union all
select 'точка', name, address, null
from public.client_locations
where client_id = '<client_id>';
```

## 7. Частые изменения

**Новые цены** действуют со следующего заказа, старые заказы хранят свою цену:

```sql
update public.client_options
set tariff_params = '{"default": {"express": 230, "slot_3h": 175, "slot_day": 145}}'::jsonb
where client_id = '<client_id>'
  and option_id = (select id from public.service_options where slug = 'city_delivery');
```

**Заблокировать клиента** (заказы создавать нельзя, история сохраняется):

```sql
update public.clients set status = 'blocked' where id = '<client_id>';
```

**Отключить опцию у клиента:**

```sql
update public.client_options
set active = false
where client_id = '<client_id>'
  and option_id = (select id from public.service_options where slug = 'city_delivery');
```
