create type public.snack_origin_status as enum (
  'confirmed_japanese',
  'likely_japanese',
  'unknown',
  'not_japanese'
);
create type public.snack_tag_type as enum ('flavour', 'taste', 'texture', 'dietary', 'other');

create or replace function public.normalize_snack_text(value text)
returns text
language sql
immutable
parallel safe
as $$
  select regexp_replace(
    lower(normalize(trim(coalesce(value, '')), NFKC)),
    '[^a-z0-9ぁ-んァ-ヶー一-龠々〆ヵヶ]+',
    '',
    'g'
  );
$$;

drop index if exists public.snacks_identity_unique;

alter table public.snacks
  alter column brand drop not null,
  alter column product_name drop not null,
  alter column flavour drop not null,
  alter column subcategory_id drop not null,
  alter column price_level drop not null,
  add column source_type text not null default 'community'
    check (source_type in ('community', 'rakuten')),
  add column rakuten_product_id text,
  add column jan_code text,
  add column name_ja text,
  add column normalized_name_ja text,
  add column source_brand_name text,
  add column maker_name text,
  add column maker_name_formal text,
  add column description_ja text,
  add column package_size_text text,
  add column unit_count integer check (unit_count is null or unit_count > 0),
  add column release_date date,
  add column rakuten_product_url text,
  add column rakuten_review_url text,
  add column rakuten_review_average numeric(4,2)
    check (rakuten_review_average is null or rakuten_review_average between 0 and 5),
  add column rakuten_review_count integer
    check (rakuten_review_count is null or rakuten_review_count >= 0),
  add column price_min_jpy integer check (price_min_jpy is null or price_min_jpy >= 0),
  add column price_max_jpy integer check (price_max_jpy is null or price_max_jpy >= 0),
  add column price_average_jpy integer check (price_average_jpy is null or price_average_jpy >= 0),
  add column price_source text
    check (price_source is null or price_source in ('product_purchasable', 'product_all_listings')),
  add column available_listing_count integer
    check (available_listing_count is null or available_listing_count >= 0),
  add column listing_count integer check (listing_count is null or listing_count >= 0),
  add column rakuten_rank integer check (rakuten_rank is null or rakuten_rank > 0),
  add column rakuten_rank_genre_id text,
  add column rakuten_rank_pool_size integer
    check (rakuten_rank_pool_size is null or rakuten_rank_pool_size >= 0),
  add column origin_status public.snack_origin_status not null default 'unknown',
  add column source_first_seen_at timestamptz,
  add column source_last_seen_at timestamptz,
  add column source_updated_at timestamptz,
  add constraint snacks_rakuten_identity check (
    (source_type = 'rakuten' and rakuten_product_id is not null)
    or (source_type = 'community' and rakuten_product_id is null)
  ),
  add constraint snacks_approved_fields check (
    status <> 'approved'
    or (
      nullif(trim(brand), '') is not null
      and nullif(trim(product_name), '') is not null
      and nullif(trim(flavour), '') is not null
      and subcategory_id is not null
      and price_level is not null
    )
  );

create unique index snacks_identity_unique
  on public.snacks (normalized_brand, normalized_product_name, normalized_flavour)
  where status = 'approved';
create unique index snacks_rakuten_product_unique
  on public.snacks (rakuten_product_id)
  where rakuten_product_id is not null;
create index snacks_jan_code_idx on public.snacks (jan_code) where jan_code is not null;
create index snacks_source_review_idx
  on public.snacks (source_type, status, origin_status, source_last_seen_at desc);

create table public.snack_images (
  id uuid primary key default gen_random_uuid(),
  snack_id uuid not null references public.snacks(id) on delete cascade,
  image_url text not null,
  source_api text not null check (source_api in ('product_search', 'item_search', 'manual')),
  source_key text,
  position integer not null default 0 check (position >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (snack_id, image_url)
);
create unique index snack_images_one_primary_idx
  on public.snack_images (snack_id) where is_primary;

create table public.rakuten_product_payloads (
  snack_id uuid primary key references public.snacks(id) on delete cascade,
  raw_product jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.rakuten_genres (
  genre_id text primary key,
  name_ja text not null,
  level integer not null check (level >= 0),
  parent_genre_id text references public.rakuten_genres(genre_id),
  path_ja text[] not null default '{}',
  raw_genre jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.snack_rakuten_genres (
  snack_id uuid not null references public.snacks(id) on delete cascade,
  genre_id text not null references public.rakuten_genres(genre_id),
  is_primary boolean not null default false,
  primary key (snack_id, genre_id)
);
create unique index snack_rakuten_genres_one_primary_idx
  on public.snack_rakuten_genres (snack_id) where is_primary;

create table public.rakuten_genre_subcategory_map (
  genre_id text primary key references public.rakuten_genres(genre_id) on delete cascade,
  subcategory_id uuid not null references public.subcategories(id) on delete restrict,
  approved_at timestamptz not null default now(),
  notes text
);

create table public.snack_tags (
  id uuid primary key default gen_random_uuid(),
  snack_id uuid not null references public.snacks(id) on delete cascade,
  tag_type public.snack_tag_type not null,
  tag_key text not null,
  display_name text not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  source_field text not null,
  evidence_text text,
  parser_version text not null,
  is_admin_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (snack_id, tag_type, tag_key, parser_version)
);
create index snack_tags_lookup_idx on public.snack_tags (tag_type, tag_key);

create table public.rakuten_product_discoveries (
  snack_id uuid not null references public.snacks(id) on delete cascade,
  seed_type text not null check (seed_type in ('genre', 'keyword', 'product_id', 'jan')),
  seed_value text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (snack_id, seed_type, seed_value)
);

create table public.rakuten_ingestion_conflicts (
  id bigint generated always as identity primary key,
  conflict_type text not null check (conflict_type in ('jan_code', 'approved_identity')),
  rakuten_product_id text not null,
  existing_snack_ids uuid[] not null default '{}',
  incoming_payload jsonb not null default '{}'::jsonb,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.rakuten_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null check (status in ('running', 'succeeded', 'failed', 'partial')),
  request_context jsonb not null default '{}'::jsonb,
  pages_requested integer not null default 0,
  records_received integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_skipped integer not null default 0,
  error_summary text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index rakuten_ingestion_runs_started_idx
  on public.rakuten_ingestion_runs (started_at desc);

create trigger snack_tags_updated_at before update on public.snack_tags
for each row execute function public.set_updated_at();

alter table public.snack_images enable row level security;
alter table public.rakuten_product_payloads enable row level security;
alter table public.rakuten_genres enable row level security;
alter table public.snack_rakuten_genres enable row level security;
alter table public.rakuten_genre_subcategory_map enable row level security;
alter table public.snack_tags enable row level security;
alter table public.rakuten_product_discoveries enable row level security;
alter table public.rakuten_ingestion_conflicts enable row level security;
alter table public.rakuten_ingestion_runs enable row level security;

create policy "Approved snack source images are public"
on public.snack_images for select
using (
  exists (
    select 1 from public.snacks
    where snacks.id = snack_images.snack_id and snacks.status = 'approved'
  )
);

create policy "Approved snack genre links are public"
on public.snack_rakuten_genres for select
using (
  exists (
    select 1 from public.snacks
    where snacks.id = snack_rakuten_genres.snack_id and snacks.status = 'approved'
  )
);

create policy "Genres attached to approved snacks are public"
on public.rakuten_genres for select
using (
  exists (
    select 1
    from public.snack_rakuten_genres
    join public.snacks on snacks.id = snack_rakuten_genres.snack_id
    where snack_rakuten_genres.genre_id = rakuten_genres.genre_id
      and snacks.status = 'approved'
  )
);

create policy "Verified approved snack tags are public"
on public.snack_tags for select
using (
  is_admin_verified
  and exists (
    select 1 from public.snacks
    where snacks.id = snack_tags.snack_id and snacks.status = 'approved'
  )
);

create or replace view public.rakuten_pending_review
with (security_invoker = true)
as
select
  s.id,
  s.rakuten_product_id,
  s.jan_code,
  s.name_ja,
  s.brand,
  s.maker_name,
  s.origin_status,
  s.status,
  s.price_min_jpy,
  s.price_max_jpy,
  s.rakuten_review_average,
  s.rakuten_review_count,
  s.source_last_seen_at,
  array_agg(distinct g.path_ja) filter (where g.genre_id is not null) as genre_paths,
  count(distinct t.id) filter (where not t.is_admin_verified) as unverified_tag_count
from public.snacks s
left join public.snack_rakuten_genres sg on sg.snack_id = s.id
left join public.rakuten_genres g on g.genre_id = sg.genre_id
left join public.snack_tags t on t.snack_id = s.id
where s.source_type = 'rakuten' and s.status = 'pending'
group by s.id;

create or replace function public.approve_rakuten_snack(
  snack_uuid uuid,
  display_brand text,
  display_product_name text,
  display_flavour text,
  mapped_subcategory_id uuid,
  mapped_price_level smallint,
  verified_origin public.snack_origin_status
)
returns public.snacks
language plpgsql
security invoker
set search_path = public
as $$
declare
  approved public.snacks;
begin
  if verified_origin not in ('confirmed_japanese', 'likely_japanese') then
    raise exception 'Rakuten snacks require a verified Japanese origin before approval';
  end if;

  update public.snacks
  set brand = nullif(trim(display_brand), ''),
      product_name = nullif(trim(display_product_name), ''),
      flavour = nullif(trim(display_flavour), ''),
      subcategory_id = mapped_subcategory_id,
      price_level = mapped_price_level,
      origin_status = verified_origin,
      status = 'approved',
      updated_at = now()
  where id = snack_uuid and source_type = 'rakuten' and status = 'pending'
  returning * into approved;

  if approved.id is null then
    raise exception 'Pending Rakuten snack not found';
  end if;
  return approved;
end;
$$;

revoke all on function public.approve_rakuten_snack(
  uuid, text, text, text, uuid, smallint, public.snack_origin_status
) from public, anon, authenticated;
