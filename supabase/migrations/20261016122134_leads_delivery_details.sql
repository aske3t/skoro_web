-- Контактная форма, вариант «Доставка»: адреса, телефон получателя, способ оплаты.
-- Только расширение схемы (ADR-0002, дополнение 2026-10-13): nullable-колонки, ничего не удаляется.
-- Для заявок kind = 'question' колонки остаются пустыми. Права и RLS таблицы leads не меняются.

alter table public.leads
  add column pickup_address   text check (char_length(pickup_address) <= 300),
  add column delivery_address text check (char_length(delivery_address) <= 300),
  add column recipient_phone  text check (char_length(recipient_phone) <= 20),
  add column payment_method   text check (payment_method in ('cash', 'online'));

comment on column public.leads.pickup_address   is 'Адрес забора (только kind = delivery)';
comment on column public.leads.delivery_address is 'Адрес доставки (только kind = delivery)';
comment on column public.leads.recipient_phone  is 'Телефон получателя / контактный на адресе доставки, E.164 (необязательно)';
comment on column public.leads.payment_method   is 'cash — наличные; online — оплата на сайте (пока только отметка, онлайн-оплаты нет: TASK-006)';
