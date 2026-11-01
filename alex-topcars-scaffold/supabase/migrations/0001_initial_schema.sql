-- Initial schema for alex.topcars. Apply only to a new Supabase project.
create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'manager', 'admin');
create type public.vehicle_status as enum ('draft', 'available', 'on_order', 'reserved', 'sold');
create type public.vehicle_source as enum ('manual', 'avito', 'telegram');
create type public.lead_status as enum ('new', 'in_progress', 'waiting_customer', 'won', 'lost');
create type public.lead_type as enum ('vehicle', 'selection', 'credit', 'commission', 'delivery');
create type public.order_status as enum ('draft', 'awaiting_payment', 'paid', 'processing', 'completed', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'cancelled', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  make text not null,
  model text not null,
  year integer check (year is null or year between 1950 and 2100),
  price_amount numeric(14,2) not null check (price_amount >= 0),
  currency text not null default 'RUB' check (currency in ('RUB','CNY','KRW','EUR','USD')),
  status public.vehicle_status not null default 'draft',
  source public.vehicle_source not null default 'manual',
  source_external_id text,
  source_url text,
  description text,
  specifications jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_external_id)
);

create table public.vehicle_media (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_path text not null,
  public_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vehicle_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type public.lead_type not null,
  status public.lead_status not null default 'new',
  vehicle_id uuid references public.vehicles(id) on delete set null,
  customer_name text,
  customer_phone text,
  message text,
  payload jsonb not null default '{}'::jsonb,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  status public.order_status not null default 'draft',
  payment_option text not null check (payment_option in ('deposit','full')),
  currency text not null default 'RUB' check (currency in ('RUB','CNY','KRW','EUR','USD')),
  total_amount numeric(14,2) not null check (total_amount > 0),
  deposit_rate numeric(5,2) not null default 5 check (deposit_rate between 0 and 100),
  amount_due numeric(14,2) not null check (amount_due > 0),
  terms_version text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null default 'sber',
  provider_payment_id text unique,
  status public.payment_status not null default 'pending',
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'RUB',
  idempotency_key text not null unique,
  payment_url text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.external_listings (
  id uuid primary key default gen_random_uuid(),
  source public.vehicle_source not null check (source in ('avito','telegram')),
  external_id text not null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  source_url text,
  last_synced_at timestamptz,
  sync_status text not null default 'pending',
  last_error text,
  raw_payload jsonb not null default '{}'::jsonb,
  unique (source, external_id)
);

create table public.integration_jobs (
  id uuid primary key default gen_random_uuid(),
  source public.vehicle_source not null check (source in ('avito','telegram')),
  status text not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  imported_count integer not null default 0,
  error_count integer not null default 0,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index vehicles_status_published_idx on public.vehicles(status, published_at desc);
create index leads_status_created_idx on public.leads(status, created_at desc);
create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index external_listings_vehicle_idx on public.external_listings(vehicle_id);

-- RLS is enabled for every business table. Public catalog reads only published inventory.
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_media enable row level security;
alter table public.favorites enable row level security;
alter table public.leads enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.external_listings enable row level security;
alter table public.integration_jobs enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "public can read published vehicles"
on public.vehicles for select
using (status = 'available' or status = 'on_order');

create policy "staff manage vehicles"
on public.vehicles for all
using (public.current_app_role() in ('manager','admin'))
with check (public.current_app_role() in ('manager','admin'));

create policy "public can read media for visible vehicles"
on public.vehicle_media for select
using (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.status in ('available','on_order')));

create policy "staff manage vehicle media"
on public.vehicle_media for all
using (public.current_app_role() in ('manager','admin'))
with check (public.current_app_role() in ('manager','admin'));

create policy "users manage own favorites"
on public.favorites for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users read own profile"
on public.profiles for select
using (id = auth.uid() or public.current_app_role() in ('manager','admin'));

create policy "users update own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "staff manage profiles"
on public.profiles for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "customers create leads"
on public.leads for insert
with check (user_id is null or user_id = auth.uid());

create policy "customers read own leads"
on public.leads for select
using (user_id = auth.uid() or public.current_app_role() in ('manager','admin'));

create policy "staff update leads"
on public.leads for update
using (public.current_app_role() in ('manager','admin'))
with check (public.current_app_role() in ('manager','admin'));

create policy "customers read own orders"
on public.orders for select
using (user_id = auth.uid() or public.current_app_role() in ('manager','admin'));

-- Orders are created only by trusted server-side Edge Functions.
-- This prevents clients from submitting or modifying their own total_amount,
-- deposit_rate, or amount_due. Edge Functions must validate vehicle price and
-- calculate the 5% deposit or full payment amount before inserting.

create policy "staff manage orders"
on public.orders for update
using (public.current_app_role() in ('manager','admin'))
with check (public.current_app_role() in ('manager','admin'));

create policy "customers read own payments"
on public.payments for select
using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()) or public.current_app_role() in ('manager','admin'));

create policy "staff read integration listings"
on public.external_listings for select
using (public.current_app_role() in ('manager','admin'));

create policy "admins manage integration listings"
on public.external_listings for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "admins read integration jobs"
on public.integration_jobs for select
using (public.current_app_role() = 'admin');

create policy "admins read audit log"
on public.audit_log for select
using (public.current_app_role() = 'admin');

-- No client-side write policies for payments, integration jobs, or audit log.
-- Create and confirm payments only in trusted Edge Functions after provider webhook verification.
