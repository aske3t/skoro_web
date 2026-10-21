create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('delivery', 'question')),
  first_name  text check (char_length(first_name) <= 100),
  last_name   text check (char_length(last_name) <= 100),
  email       text not null check (char_length(email) <= 254),
  phone       text check (char_length(phone) <= 20),
  message     text not null check (char_length(message) between 1 and 4000),
  utm         jsonb,
  ip_hash     text,
  status      text not null default 'new'
              check (status in ('new', 'in_progress', 'done', 'spam'))
);

create index leads_ip_hash_created_at_idx on public.leads (ip_hash, created_at desc);
create index leads_status_created_at_idx  on public.leads (status, created_at desc);

alter table public.leads enable row level security;
-- Политик нет намеренно: anon и authenticated не читают и не пишут.
-- Запись только с сервера Next.js через secret key (обходит RLS).
revoke all on public.leads from anon, authenticated;

comment on table  public.leads         is 'Заявки с контактной формы сайта';
comment on column public.leads.ip_hash is 'sha256(ip + LEAD_IP_SALT); только для rate-limit';
comment on column public.leads.utm     is 'utm_source / utm_medium / utm_campaign / utm_term / utm_content со страницы';
