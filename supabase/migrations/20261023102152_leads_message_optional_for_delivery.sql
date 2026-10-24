-- Комментарий к заявке на доставку необязателен (решение владельца 2026-10-23, P-36).
-- Вопрос без текста по-прежнему не принимается: это гарантирует отдельное ограничение.
-- Проверка длины 1..4000 остаётся: для NULL она не срабатывает, пустая строка не пройдёт.
alter table public.leads
  alter column message drop not null;

alter table public.leads
  add constraint leads_question_message_required
  check (kind <> 'question' or message is not null);

comment on column public.leads.message is 'Текст вопроса (обязателен для kind = question) или комментарий к доставке (необязателен)';
