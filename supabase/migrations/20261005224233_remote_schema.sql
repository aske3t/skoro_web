drop extension if exists "pg_net";

create type "public"."order_status" as enum ('new', 'in_progress', 'delivered', 'cancelled');


  create table "public"."delivery_slots" (
    "id" uuid not null default gen_random_uuid(),
    "slug" text not null,
    "label" text not null,
    "sub_label" text,
    "base_price" integer not null,
    "display_order" integer not null default 0,
    "max_lead_minutes" integer
      );


alter table "public"."delivery_slots" enable row level security;


  create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "status" public.order_status not null default 'new'::public.order_status,
    "from_address" text,
    "to_address" text,
    "price" numeric,
    "subscription_id" uuid,
    "created_at" timestamp with time zone default now(),
    "delivered_at" timestamp with time zone,
    "slot_id" uuid,
    "scheduled_for" timestamp with time zone,
    "comment" text,
    "payment_status" text not null default 'paid'::text,
    "recipient_contact" text
      );


alter table "public"."orders" enable row level security;


  create table "public"."payments" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "order_id" uuid,
    "subscription_id" uuid,
    "amount" numeric not null,
    "currency" text not null default 'CZK'::text,
    "status" text not null default 'paid'::text,
    "method" text,
    "paid_at" timestamp with time zone default now()
      );


alter table "public"."payments" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "company_name" text,
    "contact_name" text,
    "phone" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."retail_points" (
    "id" uuid not null default gen_random_uuid(),
    "brand" text not null,
    "name" text not null,
    "zone_id" uuid,
    "base_price" integer not null,
    "per_km_price" integer not null default 0,
    "delivery_service" text,
    "display_order" integer not null default 0
      );


alter table "public"."retail_points" enable row level security;


  create table "public"."service_config" (
    "id" smallint not null default 1,
    "operating_start_minute" integer not null,
    "operating_end_minute" integer not null
      );


alter table "public"."service_config" enable row level security;


  create table "public"."skoro_pricing" (
    "id" smallint not null default 1,
    "base_price" integer not null,
    "per_extra_point" integer not null,
    "per_km_price" integer not null
      );


alter table "public"."skoro_pricing" enable row level security;


  create table "public"."subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "tier_name" text not null,
    "total_deliveries" integer not null,
    "remaining_deliveries" integer not null,
    "price" numeric not null,
    "status" text not null default 'active'::text,
    "purchased_at" timestamp with time zone default now(),
    "valid_until" timestamp with time zone
      );


alter table "public"."subscriptions" enable row level security;


  create table "public"."zone_distances" (
    "from_zone_id" uuid not null,
    "to_zone_id" uuid not null,
    "distance_km" integer not null
      );


alter table "public"."zone_distances" enable row level security;


  create table "public"."zones" (
    "id" uuid not null default gen_random_uuid(),
    "slug" text not null,
    "name" text not null,
    "display_order" integer not null default 0
      );


alter table "public"."zones" enable row level security;

CREATE UNIQUE INDEX delivery_slots_pkey ON public.delivery_slots USING btree (id);

CREATE UNIQUE INDEX delivery_slots_slug_key ON public.delivery_slots USING btree (slug);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX retail_points_brand_name_key ON public.retail_points USING btree (brand, name);

CREATE UNIQUE INDEX retail_points_pkey ON public.retail_points USING btree (id);

CREATE UNIQUE INDEX service_config_pkey ON public.service_config USING btree (id);

CREATE UNIQUE INDEX skoro_pricing_pkey ON public.skoro_pricing USING btree (id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE INDEX subscriptions_user_id_idx ON public.subscriptions USING btree (user_id) WHERE (status = 'active'::text);

CREATE UNIQUE INDEX zone_distances_pkey ON public.zone_distances USING btree (from_zone_id, to_zone_id);

CREATE UNIQUE INDEX zones_pkey ON public.zones USING btree (id);

CREATE UNIQUE INDEX zones_slug_key ON public.zones USING btree (slug);

alter table "public"."delivery_slots" add constraint "delivery_slots_pkey" PRIMARY KEY using index "delivery_slots_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."retail_points" add constraint "retail_points_pkey" PRIMARY KEY using index "retail_points_pkey";

alter table "public"."service_config" add constraint "service_config_pkey" PRIMARY KEY using index "service_config_pkey";

alter table "public"."skoro_pricing" add constraint "skoro_pricing_pkey" PRIMARY KEY using index "skoro_pricing_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."zone_distances" add constraint "zone_distances_pkey" PRIMARY KEY using index "zone_distances_pkey";

alter table "public"."zones" add constraint "zones_pkey" PRIMARY KEY using index "zones_pkey";

alter table "public"."delivery_slots" add constraint "delivery_slots_slug_key" UNIQUE using index "delivery_slots_slug_key";

alter table "public"."orders" add constraint "orders_slot_id_fkey" FOREIGN KEY (slot_id) REFERENCES public.delivery_slots(id) not valid;

alter table "public"."orders" validate constraint "orders_slot_id_fkey";

alter table "public"."orders" add constraint "orders_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) not valid;

alter table "public"."orders" validate constraint "orders_subscription_id_fkey";

alter table "public"."orders" add constraint "orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_user_id_fkey";

alter table "public"."payments" add constraint "payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) not valid;

alter table "public"."payments" validate constraint "payments_order_id_fkey";

alter table "public"."payments" add constraint "payments_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) not valid;

alter table "public"."payments" validate constraint "payments_subscription_id_fkey";

alter table "public"."payments" add constraint "payments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."retail_points" add constraint "retail_points_brand_name_key" UNIQUE using index "retail_points_brand_name_key";

alter table "public"."retail_points" add constraint "retail_points_zone_id_fkey" FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE RESTRICT not valid;

alter table "public"."retail_points" validate constraint "retail_points_zone_id_fkey";

alter table "public"."service_config" add constraint "single_row" CHECK ((id = 1)) not valid;

alter table "public"."service_config" validate constraint "single_row";

alter table "public"."skoro_pricing" add constraint "skoro_pricing_id_check" CHECK ((id = 1)) not valid;

alter table "public"."skoro_pricing" validate constraint "skoro_pricing_id_check";

alter table "public"."subscriptions" add constraint "subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_user_id_fkey";

alter table "public"."zone_distances" add constraint "zone_distances_from_zone_id_fkey" FOREIGN KEY (from_zone_id) REFERENCES public.zones(id) ON DELETE CASCADE not valid;

alter table "public"."zone_distances" validate constraint "zone_distances_from_zone_id_fkey";

alter table "public"."zone_distances" add constraint "zone_distances_to_zone_id_fkey" FOREIGN KEY (to_zone_id) REFERENCES public.zones(id) ON DELETE CASCADE not valid;

alter table "public"."zone_distances" validate constraint "zone_distances_to_zone_id_fkey";

alter table "public"."zones" add constraint "zones_slug_key" UNIQUE using index "zones_slug_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_order_for_user(p_from_address text, p_to_address text, p_slot_id uuid, p_scheduled_for timestamp with time zone, p_recipient_contact text, p_comment text DEFAULT NULL::text)
 RETURNS public.orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_sub  subscriptions;
  v_slot delivery_slots;
  v_order orders;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select * into v_slot from delivery_slots where id = p_slot_id;
  if not found then raise exception 'invalid slot'; end if;

  select * into v_sub
  from subscriptions
  where user_id = v_user and status = 'active' and remaining_deliveries > 0
  order by purchased_at desc
  limit 1
  for update;

  if found then
    update subscriptions set remaining_deliveries = remaining_deliveries - 1
      where id = v_sub.id;
    insert into orders (user_id, status, payment_status, from_address, to_address,
                        slot_id, scheduled_for, recipient_contact, comment,
                        subscription_id, price)
    values (v_user, 'new', 'paid', p_from_address, p_to_address,
            p_slot_id, p_scheduled_for, p_recipient_contact, p_comment,
            v_sub.id, 0)
    returning * into v_order;
  else
    insert into orders (user_id, status, payment_status, from_address, to_address,
                        slot_id, scheduled_for, recipient_contact, comment, price)
    values (v_user, 'new', 'pending_payment', p_from_address, p_to_address,
            p_slot_id, p_scheduled_for, p_recipient_contact, p_comment,
            v_slot.base_price)
    returning * into v_order;
  end if;

  return v_order;
end;
$function$
;

grant delete on table "public"."delivery_slots" to "anon";

grant insert on table "public"."delivery_slots" to "anon";

grant references on table "public"."delivery_slots" to "anon";

grant select on table "public"."delivery_slots" to "anon";

grant trigger on table "public"."delivery_slots" to "anon";

grant truncate on table "public"."delivery_slots" to "anon";

grant update on table "public"."delivery_slots" to "anon";

grant delete on table "public"."delivery_slots" to "authenticated";

grant insert on table "public"."delivery_slots" to "authenticated";

grant references on table "public"."delivery_slots" to "authenticated";

grant select on table "public"."delivery_slots" to "authenticated";

grant trigger on table "public"."delivery_slots" to "authenticated";

grant truncate on table "public"."delivery_slots" to "authenticated";

grant update on table "public"."delivery_slots" to "authenticated";

grant delete on table "public"."delivery_slots" to "service_role";

grant insert on table "public"."delivery_slots" to "service_role";

grant references on table "public"."delivery_slots" to "service_role";

grant select on table "public"."delivery_slots" to "service_role";

grant trigger on table "public"."delivery_slots" to "service_role";

grant truncate on table "public"."delivery_slots" to "service_role";

grant update on table "public"."delivery_slots" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."payments" to "anon";

grant insert on table "public"."payments" to "anon";

grant references on table "public"."payments" to "anon";

grant select on table "public"."payments" to "anon";

grant trigger on table "public"."payments" to "anon";

grant truncate on table "public"."payments" to "anon";

grant update on table "public"."payments" to "anon";

grant delete on table "public"."payments" to "authenticated";

grant insert on table "public"."payments" to "authenticated";

grant references on table "public"."payments" to "authenticated";

grant select on table "public"."payments" to "authenticated";

grant trigger on table "public"."payments" to "authenticated";

grant truncate on table "public"."payments" to "authenticated";

grant update on table "public"."payments" to "authenticated";

grant delete on table "public"."payments" to "service_role";

grant insert on table "public"."payments" to "service_role";

grant references on table "public"."payments" to "service_role";

grant select on table "public"."payments" to "service_role";

grant trigger on table "public"."payments" to "service_role";

grant truncate on table "public"."payments" to "service_role";

grant update on table "public"."payments" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."retail_points" to "anon";

grant insert on table "public"."retail_points" to "anon";

grant references on table "public"."retail_points" to "anon";

grant select on table "public"."retail_points" to "anon";

grant trigger on table "public"."retail_points" to "anon";

grant truncate on table "public"."retail_points" to "anon";

grant update on table "public"."retail_points" to "anon";

grant delete on table "public"."retail_points" to "authenticated";

grant insert on table "public"."retail_points" to "authenticated";

grant references on table "public"."retail_points" to "authenticated";

grant select on table "public"."retail_points" to "authenticated";

grant trigger on table "public"."retail_points" to "authenticated";

grant truncate on table "public"."retail_points" to "authenticated";

grant update on table "public"."retail_points" to "authenticated";

grant delete on table "public"."retail_points" to "service_role";

grant insert on table "public"."retail_points" to "service_role";

grant references on table "public"."retail_points" to "service_role";

grant select on table "public"."retail_points" to "service_role";

grant trigger on table "public"."retail_points" to "service_role";

grant truncate on table "public"."retail_points" to "service_role";

grant update on table "public"."retail_points" to "service_role";

grant delete on table "public"."service_config" to "anon";

grant insert on table "public"."service_config" to "anon";

grant references on table "public"."service_config" to "anon";

grant select on table "public"."service_config" to "anon";

grant trigger on table "public"."service_config" to "anon";

grant truncate on table "public"."service_config" to "anon";

grant update on table "public"."service_config" to "anon";

grant delete on table "public"."service_config" to "authenticated";

grant insert on table "public"."service_config" to "authenticated";

grant references on table "public"."service_config" to "authenticated";

grant select on table "public"."service_config" to "authenticated";

grant trigger on table "public"."service_config" to "authenticated";

grant truncate on table "public"."service_config" to "authenticated";

grant update on table "public"."service_config" to "authenticated";

grant delete on table "public"."service_config" to "service_role";

grant insert on table "public"."service_config" to "service_role";

grant references on table "public"."service_config" to "service_role";

grant select on table "public"."service_config" to "service_role";

grant trigger on table "public"."service_config" to "service_role";

grant truncate on table "public"."service_config" to "service_role";

grant update on table "public"."service_config" to "service_role";

grant delete on table "public"."skoro_pricing" to "anon";

grant insert on table "public"."skoro_pricing" to "anon";

grant references on table "public"."skoro_pricing" to "anon";

grant select on table "public"."skoro_pricing" to "anon";

grant trigger on table "public"."skoro_pricing" to "anon";

grant truncate on table "public"."skoro_pricing" to "anon";

grant update on table "public"."skoro_pricing" to "anon";

grant delete on table "public"."skoro_pricing" to "authenticated";

grant insert on table "public"."skoro_pricing" to "authenticated";

grant references on table "public"."skoro_pricing" to "authenticated";

grant select on table "public"."skoro_pricing" to "authenticated";

grant trigger on table "public"."skoro_pricing" to "authenticated";

grant truncate on table "public"."skoro_pricing" to "authenticated";

grant update on table "public"."skoro_pricing" to "authenticated";

grant delete on table "public"."skoro_pricing" to "service_role";

grant insert on table "public"."skoro_pricing" to "service_role";

grant references on table "public"."skoro_pricing" to "service_role";

grant select on table "public"."skoro_pricing" to "service_role";

grant trigger on table "public"."skoro_pricing" to "service_role";

grant truncate on table "public"."skoro_pricing" to "service_role";

grant update on table "public"."skoro_pricing" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

grant delete on table "public"."zone_distances" to "anon";

grant insert on table "public"."zone_distances" to "anon";

grant references on table "public"."zone_distances" to "anon";

grant select on table "public"."zone_distances" to "anon";

grant trigger on table "public"."zone_distances" to "anon";

grant truncate on table "public"."zone_distances" to "anon";

grant update on table "public"."zone_distances" to "anon";

grant delete on table "public"."zone_distances" to "authenticated";

grant insert on table "public"."zone_distances" to "authenticated";

grant references on table "public"."zone_distances" to "authenticated";

grant select on table "public"."zone_distances" to "authenticated";

grant trigger on table "public"."zone_distances" to "authenticated";

grant truncate on table "public"."zone_distances" to "authenticated";

grant update on table "public"."zone_distances" to "authenticated";

grant delete on table "public"."zone_distances" to "service_role";

grant insert on table "public"."zone_distances" to "service_role";

grant references on table "public"."zone_distances" to "service_role";

grant select on table "public"."zone_distances" to "service_role";

grant trigger on table "public"."zone_distances" to "service_role";

grant truncate on table "public"."zone_distances" to "service_role";

grant update on table "public"."zone_distances" to "service_role";

grant delete on table "public"."zones" to "anon";

grant insert on table "public"."zones" to "anon";

grant references on table "public"."zones" to "anon";

grant select on table "public"."zones" to "anon";

grant trigger on table "public"."zones" to "anon";

grant truncate on table "public"."zones" to "anon";

grant update on table "public"."zones" to "anon";

grant delete on table "public"."zones" to "authenticated";

grant insert on table "public"."zones" to "authenticated";

grant references on table "public"."zones" to "authenticated";

grant select on table "public"."zones" to "authenticated";

grant trigger on table "public"."zones" to "authenticated";

grant truncate on table "public"."zones" to "authenticated";

grant update on table "public"."zones" to "authenticated";

grant delete on table "public"."zones" to "service_role";

grant insert on table "public"."zones" to "service_role";

grant references on table "public"."zones" to "service_role";

grant select on table "public"."zones" to "service_role";

grant trigger on table "public"."zones" to "service_role";

grant truncate on table "public"."zones" to "service_role";

grant update on table "public"."zones" to "service_role";


  create policy "read slots"
  on "public"."delivery_slots"
  as permissive
  for select
  to public
using (true);



  create policy "own orders"
  on "public"."orders"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "own payments"
  on "public"."payments"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "read retail_points"
  on "public"."retail_points"
  as permissive
  for select
  to public
using (true);



  create policy "read skoro_pricing"
  on "public"."skoro_pricing"
  as permissive
  for select
  to public
using (true);



  create policy "own subscriptions"
  on "public"."subscriptions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "read zone_distances"
  on "public"."zone_distances"
  as permissive
  for select
  to public
using (true);



  create policy "read zones"
  on "public"."zones"
  as permissive
  for select
  to public
using (true);



