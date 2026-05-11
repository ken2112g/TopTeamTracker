-- EtsyPulse Database Schema
-- Chạy file này trong Supabase SQL Editor: supabase.com → SQL Editor → New query

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- COLLECTIONS
-- ============================================================
create table if not exists collections (
  id            text primary key default concat('coll_', replace(gen_random_uuid()::text, '-', '')),
  name          text not null,
  keyword       text,
  color         text not null default '#f1641e',
  description   text,
  created_at    timestamptz not null default now(),
  listings_count int not null default 0
);

-- ============================================================
-- LISTINGS
-- ============================================================
create table if not exists listings (
  id                text primary key default concat('lst_', replace(gen_random_uuid()::text, '-', '')),
  etsy_listing_id   text not null unique,
  url               text not null,
  title             text not null,
  shop_name         text not null,
  emoji             text,
  image_url         text,
  current_price     numeric(10,2),
  old_price         numeric(10,2),
  rating            numeric(3,2),
  reviews_count     int not null default 0,
  is_active         boolean not null default true,
  snapshot_mode     text not null default 'daily' check (snapshot_mode in ('daily','hourly','6hours')),
  collection_id     text references collections(id) on delete set null,
  first_tracked_at  timestamptz not null default now(),
  last_snapshot_at  timestamptz,
  etsy_created_at   timestamptz,
  etsy_updated_at   timestamptz,
  favorites_count   int,
  country           text default 'US',
  currency          text default 'USD'
);

create index if not exists listings_collection_id_idx on listings(collection_id);
create index if not exists listings_is_active_idx on listings(is_active);

-- ============================================================
-- SNAPSHOTS
-- ============================================================
create table if not exists snapshots (
  id            text primary key default concat('snap_', replace(gen_random_uuid()::text, '-', '')),
  listing_id    text not null references listings(id) on delete cascade,
  captured_at   timestamptz not null default now(),
  source        text not null default 'etsy_scrape' check (source in ('etsy_scrape','heyetsy','estimate')),
  sold_total    int not null default 0,
  sold_daily    int not null default 0,
  views_total   int not null default 0,
  views_daily   int not null default 0,
  revenue_usd   numeric(12,2) not null default 0,
  price         numeric(10,2) not null default 0,
  favorites     int,
  reviews_count int,
  rating        numeric(3,2),
  confidence    numeric(5,2)
);

create index if not exists snapshots_listing_id_idx on snapshots(listing_id);
create index if not exists snapshots_captured_at_idx on snapshots(captured_at desc);

-- ============================================================
-- TAGS
-- ============================================================
create table if not exists tags (
  id    text primary key default concat('tag_', replace(gen_random_uuid()::text, '-', '')),
  name  text not null unique,
  color text not null default '#f1641e'
);

-- ============================================================
-- TRIGGER: auto-update listings_count trên collections
-- ============================================================
create or replace function update_collection_listings_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' and NEW.collection_id is not null then
    update collections set listings_count = listings_count + 1 where id = NEW.collection_id;
  elsif TG_OP = 'DELETE' and OLD.collection_id is not null then
    update collections set listings_count = greatest(listings_count - 1, 0) where id = OLD.collection_id;
  elsif TG_OP = 'UPDATE' then
    if OLD.collection_id is distinct from NEW.collection_id then
      if OLD.collection_id is not null then
        update collections set listings_count = greatest(listings_count - 1, 0) where id = OLD.collection_id;
      end if;
      if NEW.collection_id is not null then
        update collections set listings_count = listings_count + 1 where id = NEW.collection_id;
      end if;
    end if;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_listings_count on listings;
create trigger trg_listings_count
after insert or update of collection_id or delete on listings
for each row execute function update_collection_listings_count();

-- ============================================================
-- RLS (Row Level Security) — disable cho demo localhost
-- Bật lại khi có Auth
-- ============================================================
alter table collections disable row level security;
alter table listings disable row level security;
alter table snapshots disable row level security;
alter table tags disable row level security;
