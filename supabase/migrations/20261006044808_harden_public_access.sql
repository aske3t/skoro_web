-- TASK-003, блок 0 (P-14, P-20, P-16 частично). См. docs/architecture/db-security.md.

-- P-14: рабочие часы читают все (CURRENT §5)
create policy "read service_config"
  on public.service_config
  as permissive
  for select
  to anon, authenticated
  using (true);

-- P-20: запись в public — только сервер (ADR-0003). SELECT не трогаем.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger
  on tables from anon, authenticated;

-- P-20: явные роли вместо public
alter policy "read slots"          on public.delivery_slots to anon, authenticated;
alter policy "read retail_points"  on public.retail_points  to anon, authenticated;
alter policy "read skoro_pricing"  on public.skoro_pricing  to anon, authenticated;
alter policy "read zone_distances" on public.zone_distances to anon, authenticated;
alter policy "read zones"          on public.zones          to anon, authenticated;
alter policy "own orders"          on public.orders         to authenticated;
alter policy "own payments"        on public.payments       to authenticated;
alter policy "own profile"         on public.profiles       to authenticated;
alter policy "own subscriptions"   on public.subscriptions  to authenticated;

-- P-16 (частично): RPC заказа только для вошедших. Полностью внутренней она станет в TASK-005.
revoke execute on function public.create_order_for_user(text, text, uuid, timestamptz, text, text)
  from public, anon;
grant execute on function public.create_order_for_user(text, text, uuid, timestamptz, text, text)
  to authenticated;
