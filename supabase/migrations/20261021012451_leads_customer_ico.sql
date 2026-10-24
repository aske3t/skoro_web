-- Тип клиента и IČO в заявке на доставку (решение владельца 2026-10-21, PROPOSALS P-31).
-- Для компании IČO обязательно и проверяется в ARES; название фирмы берётся из ARES.
-- Колонки nullable: у вопросов и старых заявок их нет.
alter table public.leads
  add column customer_type text check (customer_type in ('company', 'person')),
  add column ico           text check (ico ~ '^[0-9]{8}$'),
  add column company_name  text check (char_length(company_name) <= 300),
  add column ico_verified  boolean;

comment on column public.leads.customer_type is 'company | person; только для kind = delivery';
comment on column public.leads.ico           is 'IČO компании (8 цифр, контрольная сумма проверена сервером)';
comment on column public.leads.company_name  is 'Название фирмы из ARES; null, если ARES был недоступен';
comment on column public.leads.ico_verified  is 'true — фирма найдена в ARES и активна; false — ARES недоступен, проверена только контрольная сумма';
