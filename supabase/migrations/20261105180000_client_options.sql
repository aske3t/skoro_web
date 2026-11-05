-- Пилот клиентского бота (ADR-0006). Только расширение схемы, совместимое с кодом `main`
-- (ADR-0002, дополнение): новые таблицы и функция, новые колонки orders и leads.
-- Данные клиентов сюда не попадают: репозиторий публичный, их вносит владелец (docs/ops/clients.md).

-- Клиенты, их люди и точки ----------------------------------------------------------------

create table public.clients (
  id                     uuid primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),
  type                   text not null check (type in ('company', 'person')),
  name                   text not null check (char_length(name) between 1 and 300),
  ico                    text check (ico ~ '^[0-9]{8}$'),
  email                  text check (char_length(email) <= 254),
  phone                  text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  default_payment_method text not null default 'invoice'
                           check (default_payment_method in ('invoice', 'cash')),
  -- pending по умолчанию: клиент заказывает, только если его явно сделали active.
  status                 text not null default 'pending'
                           check (status in ('pending', 'active', 'blocked')),
  constraint clients_company_has_ico check (type <> 'company' or ico is not null)
);

create table public.client_contacts (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  client_id         uuid not null references public.clients (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 100),
  phone             text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email             text check (char_length(email) <= 254),
  telegram_user_id  bigint unique,
  status            text not null default 'active' check (status in ('active', 'blocked')),
  invite_token_hash text unique,
  invite_expires_at timestamptz,
  constraint client_contacts_invite_pair
    check ((invite_token_hash is null) = (invite_expires_at is null))
);

create index client_contacts_client_id_idx on public.client_contacts (client_id);

create table public.client_locations (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 200),
  address       text not null check (char_length(address) between 1 and 300),
  latitude      double precision,
  longitude     double precision,
  contact_name  text check (char_length(contact_name) <= 100),
  contact_phone text check (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint client_locations_coordinates_pair check ((latitude is null) = (longitude is null))
);

create index client_locations_client_id_idx on public.client_locations (client_id);

-- Все, кто писал любому из ботов в личку. Telegram id один и тот же для обоих ботов.
create table public.telegram_users (
  telegram_user_id bigint primary key,
  first_name       text,
  last_name        text,
  username         text,
  last_seen_at     timestamptz not null default now()
);

-- Опции ------------------------------------------------------------------------------------

create table public.service_options (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  slug          text not null unique check (slug ~ '^[a-z0-9_]+$'),
  name          text not null check (char_length(name) between 1 and 200),
  description   text,
  form_kind     text not null,
  -- null — общая опция, иначе уникальная опция этого клиента.
  client_id     uuid references public.clients (id) on delete cascade,
  active        boolean not null default true,
  display_order integer not null default 0
);

create index service_options_client_id_idx on public.service_options (client_id)
  where client_id is not null;

create table public.client_options (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  option_id     uuid not null references public.service_options (id) on delete restrict,
  custom_name   text check (char_length(custom_name) <= 200),
  tariff_kind   text not null,
  tariff_params jsonb not null,
  form_defaults jsonb not null default '{}'::jsonb,
  active        boolean not null default true,
  display_order integer not null default 0,
  unique (client_id, option_id)
);

create index client_options_option_id_idx on public.client_options (option_id);

-- Уникальную опцию можно подключить только её клиенту (ADR-0006 §1).
create function public.client_options_check_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select o.client_id into v_owner from public.service_options o where o.id = new.option_id;
  if v_owner is not null and v_owner <> new.client_id then
    raise exception 'option_belongs_to_other_client';
  end if;
  return new;
end;
$$;

revoke execute on function public.client_options_check_owner() from public, anon, authenticated;

create trigger client_options_check_owner
  before insert or update of client_id, option_id on public.client_options
  for each row execute function public.client_options_check_owner();

-- Общий каталог: в пилоте одна опция. Тариф у неё свой у каждого клиента.
insert into public.service_options (slug, name, form_kind)
values ('city_delivery', 'Доставка по городу', 'city_delivery');

-- Служебное ботов ---------------------------------------------------------------------------

-- Факт отправки уведомлений: идемпотентность и повтор кнопкой (правило P-30).
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entity     text not null check (entity in ('lead', 'order')),
  entity_id  uuid not null,
  event      text not null,
  channel    text not null check (channel in ('telegram', 'email')),
  recipient  text,
  sent_at    timestamptz,
  last_error text,
  attempts   integer not null default 0 check (attempts >= 0),
  unique (entity, entity_id, event, channel)
);

-- Хранилище session() grammY. Ключ с префиксом бота: client:<chat_id>, service:<chat_id>.
create table public.bot_sessions (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Доступ: только сервер (ADR-0006 §1). Политик нет, политики чтения добавит кабинет (TASK-005).
alter table public.clients          enable row level security;
alter table public.client_contacts  enable row level security;
alter table public.client_locations enable row level security;
alter table public.telegram_users   enable row level security;
alter table public.service_options  enable row level security;
alter table public.client_options   enable row level security;
alter table public.notifications    enable row level security;
alter table public.bot_sessions     enable row level security;

revoke all on public.clients, public.client_contacts, public.client_locations, public.telegram_users,
  public.service_options, public.client_options, public.notifications, public.bot_sessions
  from public, anon, authenticated;

grant select, insert, update, delete on public.clients, public.client_contacts, public.client_locations,
  public.telegram_users, public.service_options, public.client_options, public.notifications,
  public.bot_sessions
  to service_role;

-- orders ------------------------------------------------------------------------------------

-- У заказа из бота нет пользователя Auth. RLS `auth.uid() = user_id` скрывает такие строки от кабинета.
alter table public.orders alter column user_id drop not null;

alter table public.orders
  add column client_id        uuid references public.clients (id) on delete restrict,
  add column client_option_id uuid references public.client_options (id) on delete restrict,
  add column contact_id       uuid references public.client_contacts (id) on delete restrict,
  add column created_via      text check (created_via in ('bot', 'web', 'admin')),
  add column form_data        jsonb,
  add column price_breakdown  jsonb,
  add column tariff_kind      text,
  add column accepted_at      timestamptz,
  add column cancelled_at     timestamptz,
  add column cancelled_by     text check (cancelled_by in ('client', 'admin')),
  add column handled_by_tg_id bigint,
  add column handled_by_name  text,
  add column tg_chat_id       bigint,
  add column tg_message_id    bigint;

create index orders_client_id_created_at_idx on public.orders (client_id, created_at desc)
  where client_id is not null;
create index orders_client_option_id_idx on public.orders (client_option_id)
  where client_option_id is not null;
create index orders_contact_id_idx on public.orders (contact_id)
  where contact_id is not null;

-- Номер заказа для клиента и команды, как leads.number: старые строки нумеруются по времени создания.
create sequence public.orders_number_seq as bigint minvalue 0 start with 0;

alter table public.orders add column number bigint;

with ordered as (
  select id, row_number() over (order by created_at, id) - 1 as n
  from public.orders
)
update public.orders o
set number = ordered.n
from ordered
where o.id = ordered.id;

select setval(
  'public.orders_number_seq',
  coalesce((select max(number) + 1 from public.orders), 0),
  false
);

alter sequence public.orders_number_seq owned by public.orders.number;
alter table public.orders alter column number set default nextval('public.orders_number_seq');
create unique index orders_number_key on public.orders (number);

revoke all on sequence public.orders_number_seq from public, anon, authenticated;
grant usage, select on sequence public.orders_number_seq to service_role;

-- Опасный default 'paid' убирается (P-19). Код `main` пишет через create_order_for_user,
-- она задаёт оба значения явно; других значений в данных нет (диагностика 2026-11-05).
alter table public.orders alter column payment_status set default 'pending_payment';
alter table public.orders
  add constraint orders_payment_status_check check (payment_status in ('paid', 'pending_payment'));

-- Заказ по опции (ADR-0006 §6). Цену считает сервер, клиента функция берёт из контакта.
create function public.create_option_order(
  p_contact_id        uuid,
  p_client_option_id  uuid,
  p_created_via       text,
  p_form_data         jsonb,
  p_price             numeric,
  p_price_breakdown   jsonb,
  p_tariff_kind       text,
  p_slot_id           uuid,
  p_from_address      text,
  p_to_address        text,
  p_scheduled_for     timestamptz default null,
  p_recipient_contact text default null,
  p_comment           text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contact       public.client_contacts;
  v_client_status text;
  v_option_active boolean;
  v_order         public.orders;
begin
  select * into v_contact from public.client_contacts where id = p_contact_id;
  if not found or v_contact.status <> 'active' then
    raise exception 'not_linked';
  end if;

  select status into v_client_status from public.clients where id = v_contact.client_id;
  if v_client_status is distinct from 'active' then
    raise exception 'client_inactive';
  end if;

  select co.active and so.active into v_option_active
  from public.client_options co
  join public.service_options so on so.id = co.option_id
  where co.id = p_client_option_id and co.client_id = v_contact.client_id;
  if v_option_active is not true then
    raise exception 'option_unavailable';
  end if;

  if p_price is null or p_price < 0 then
    raise exception 'invalid_price';
  end if;

  insert into public.orders (
    client_id, client_option_id, contact_id, created_via, form_data, price, price_breakdown,
    tariff_kind, slot_id, from_address, to_address, scheduled_for, recipient_contact, comment,
    status, payment_status
  )
  values (
    v_contact.client_id, p_client_option_id, p_contact_id, p_created_via, p_form_data, p_price,
    p_price_breakdown, p_tariff_kind, p_slot_id, p_from_address, p_to_address, p_scheduled_for,
    p_recipient_contact, p_comment, 'new', 'pending_payment'
  )
  returning * into v_order;

  return v_order;
end;
$$;

revoke execute on function public.create_option_order(
  uuid, uuid, text, jsonb, numeric, jsonb, text, uuid, text, text, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function public.create_option_order(
  uuid, uuid, text, jsonb, numeric, jsonb, text, uuid, text, text, timestamptz, text, text
) to service_role;

-- leads --------------------------------------------------------------------------------------

alter table public.leads add column delivery_at timestamptz;

comment on column public.leads.delivery_at is 'Ко времени доставки; null — как можно скорее';
comment on column public.orders.number is 'Порядковый номер заказа (с 0), показывается клиенту и в Telegram';
comment on column public.orders.created_via is 'Канал заказа; null — старый заказ из кабинета';
comment on column public.orders.form_data is 'Снимок данных формы опции';
comment on column public.orders.price_breakdown is 'Снимок разбивки цены (Quote)';
comment on column public.client_options.tariff_params is 'Параметры вида тарифа; проверяются zod при каждом расчёте';
comment on column public.client_options.form_defaults is 'Предзаполнение формы, например фиксированная точка забора';
