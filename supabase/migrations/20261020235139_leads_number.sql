-- Порядковый номер заявки для клиента и команды (письмо, Telegram), с нуля.
-- Только расширение схемы (ADR-0002, дополнение 2026-10-13): новая последовательность и
-- nullable-колонка с default. Identity-колонка не подходит: она всегда NOT NULL.

create sequence public.leads_number_seq as bigint minvalue 0 start with 0;

alter table public.leads add column number bigint;

-- Уже существующие заявки нумеруются по времени создания: 0, 1, 2, …
with ordered as (
  select id, row_number() over (order by created_at, id) - 1 as n
  from public.leads
)
update public.leads l
set number = ordered.n
from ordered
where l.id = ordered.id;

-- Следующая заявка получит max + 1 (или 0, если заявок не было).
select setval(
  'public.leads_number_seq',
  coalesce((select max(number) + 1 from public.leads), 0),
  false
);

alter sequence public.leads_number_seq owned by public.leads.number;
alter table public.leads alter column number set default nextval('public.leads_number_seq');
create unique index leads_number_key on public.leads (number);

-- Как и у leads: клиентам доступа нет, вставка только с сервера (service_role).
revoke all on sequence public.leads_number_seq from public, anon, authenticated;
grant usage, select on sequence public.leads_number_seq to service_role;

comment on column public.leads.number is 'Порядковый номер заявки (с 0), показывается клиенту и в Telegram';
