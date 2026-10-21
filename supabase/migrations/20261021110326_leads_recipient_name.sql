-- Имя получателя в заявке на доставку (запрос владельца 2026-10-21). Необязательное, как и телефон получателя.
alter table public.leads
  add column recipient_name text check (char_length(recipient_name) <= 100);

comment on column public.leads.recipient_name is 'Имя получателя; только для kind = delivery';
