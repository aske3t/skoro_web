-- Подписка на рассылку из футера (решение владельца 2026-10-30, P-40).
-- Как у leads: запись только с сервера Next.js через secret key, политик нет,
-- anon и authenticated не читают и не пишут.
create table public.newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  email           text not null unique check (char_length(email) <= 254),
  consented_at    timestamptz not null,
  ip_hash         text,
  unsubscribed_at timestamptz
);

create index newsletter_subscribers_ip_hash_created_at_idx
  on public.newsletter_subscribers (ip_hash, created_at desc);

alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from anon, authenticated;

comment on table  public.newsletter_subscribers                 is 'Подписчики рассылки (форма в футере)';
comment on column public.newsletter_subscribers.email           is 'В нижнем регистре; повторная подписка не создаёт дубль';
comment on column public.newsletter_subscribers.consented_at    is 'Когда отмечено согласие на рассылку';
comment on column public.newsletter_subscribers.ip_hash         is 'sha256(ip + LEAD_IP_SALT); только для rate-limit';
comment on column public.newsletter_subscribers.unsubscribed_at is 'Отписка; null — подписан';
