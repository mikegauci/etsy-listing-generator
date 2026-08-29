-- Multi-shop support + mockup storage

alter table public.generated_listings
  add column if not exists shop_id text not null default 'motor-element';

alter table public.shop_listings
  add column if not exists shop_id text not null default 'motor-element';

alter table public.title_checklist
  add column if not exists shop_id text not null default 'motor-element';

update public.title_checklist set shop_id = 'motor-element' where shop_id is null;

drop index if exists title_checklist_shop_id_key;
create unique index if not exists title_checklist_shop_id_key
  on public.title_checklist (shop_id);

alter table public.shop_listings
  drop constraint if exists shop_listings_etsy_listing_id_key;

create unique index if not exists shop_listings_shop_etsy_key
  on public.shop_listings (shop_id, etsy_listing_id);

create table if not exists public.generated_mockups (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  shop_id text not null,
  base_image_id text not null,
  color_id text not null,
  color_label text not null,
  color_hex text not null,
  prompt text not null,
  artwork_url text,
  artwork_name text,
  personalization_name text,
  fal_url text,
  storage_path text,
  public_url text,
  model text not null,
  resolution text,
  aspect_ratio text,
  output_format text,
  status text not null default 'succeeded',
  error text,
  created_at timestamptz not null default now()
);

create index if not exists generated_mockups_run_idx
  on public.generated_mockups (run_id);

create index if not exists generated_mockups_shop_idx
  on public.generated_mockups (shop_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('mockups', 'mockups', true)
on conflict (id) do nothing;
