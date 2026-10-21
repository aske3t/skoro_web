-- Служебный Telegram-бот, шаг 2: кто и когда обработал заявку кнопкой в группе.
-- Только расширение схемы (ADR-0002, дополнение 2026-10-13): nullable-колонки, ничего не удаляется.
-- Права и RLS таблицы leads не меняются: политик нет, anon и authenticated отозваны, запись только с сервера.

alter table public.leads
  add column handled_by_tg_id bigint,
  add column handled_by_name  text check (char_length(handled_by_name) <= 200),
  add column handled_at       timestamptz;

comment on column public.leads.handled_by_tg_id is 'Telegram user id админа, нажавшего кнопку под заявкой';
comment on column public.leads.handled_by_name  is 'Имя админа из Telegram на момент нажатия';
comment on column public.leads.handled_at       is 'Когда заявку взяли в работу или пометили спамом';
