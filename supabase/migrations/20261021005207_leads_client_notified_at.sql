-- Письмо клиенту «заявка принята»: факт отправки хранится в БД, а не в памяти процесса.
-- Пусто у заявки в работе = письмо не ушло (сбой Resend, падение бота) → бот предлагает повтор.
-- Только расширение схемы (ADR-0002, дополнение 2026-10-13): nullable-колонка.

alter table public.leads add column client_notified_at timestamptz;

comment on column public.leads.client_notified_at is 'Когда клиенту ушло письмо «заявка принята в работу»; null — не отправлено';
