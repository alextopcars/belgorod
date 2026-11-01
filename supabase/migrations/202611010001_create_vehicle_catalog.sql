create extension if not exists pgcrypto;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  source_post_key text not null unique,
  telegram_chat_id bigint not null,
  telegram_message_id bigint not null,
  telegram_media_group_id text,
  source_url text,
  title text not null,
  brand text,
  model text,
  year integer,
  price numeric,
  currency text not null default 'RUB',
  mileage_km integer,
  engine text,
  transmission text,
  drive text,
  description text,
  status text not null default 'available' check (status in ('available','on_order','sold','archived')),
  photos jsonb not null default '[]'::jsonb,
  raw_text text,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists vehicles_status_created_idx on public.vehicles(status, created_at desc);
create index if not exists vehicles_brand_model_idx on public.vehicles(brand, model);
alter table public.vehicles enable row level security;

drop policy if exists "Public can read active catalog" on public.vehicles;
create policy "Public can read active catalog" on public.vehicles
for select to anon, authenticated
using (status in ('available','on_order','sold'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-photos', 'vehicle-photos', true, 12582912, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true;
