create extension if not exists pgcrypto;

create type public.snack_status as enum ('pending', 'approved', 'rejected');
create type public.report_status as enum ('open', 'resolved', 'dismissed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username is null or char_length(trim(username)) between 2 and 30),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create or replace function public.normalize_snack_text(value text)
returns text
language sql
immutable
parallel safe
as $$
  select regexp_replace(lower(trim(coalesce(value, ''))), '[^a-z0-9]+', '', 'g');
$$;

create table public.snacks (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (char_length(trim(brand)) between 1 and 80),
  product_name text not null check (char_length(trim(product_name)) between 1 and 120),
  flavour text not null check (char_length(trim(flavour)) between 1 and 120),
  normalized_brand text generated always as (public.normalize_snack_text(brand)) stored,
  normalized_product_name text generated always as (public.normalize_snack_text(product_name)) stored,
  normalized_flavour text generated always as (public.normalize_snack_text(flavour)) stored,
  description text check (description is null or char_length(trim(description)) <= 500),
  image_url text,
  subcategory_id uuid not null references public.subcategories(id),
  price_level smallint not null check (price_level between 1 and 3),
  created_by uuid references public.profiles(id) on delete set null,
  status public.snack_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index snacks_identity_unique
  on public.snacks (normalized_brand, normalized_product_name, normalized_flavour)
  where status <> 'rejected';
create index snacks_status_created_idx on public.snacks (status, created_at desc);
create index snacks_subcategory_idx on public.snacks (subcategory_id);

create table public.snack_categories (
  snack_id uuid not null references public.snacks(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  primary key (snack_id, category_id)
);
create index snack_categories_category_idx on public.snack_categories (category_id, snack_id);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  snack_id uuid not null references public.snacks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  taste smallint not null check (taste between 1 and 10),
  texture smallint not null check (texture between 1 and 10),
  value smallint not null check (value between 1 and 10),
  packaging smallint not null check (packaging between 1 and 10),
  buy_again smallint not null check (buy_again between 1 and 10),
  overall_score numeric(3,1) not null check (overall_score between 1 and 10),
  review_text text check (review_text is null or char_length(trim(review_text)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (snack_id, user_id)
);
create index ratings_snack_updated_idx on public.ratings (snack_id, updated_at desc);
create index ratings_user_updated_idx on public.ratings (user_id, updated_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  snack_id uuid references public.snacks(id) on delete cascade,
  rating_id uuid references public.ratings(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 300),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  check (snack_id is not null or rating_id is not null)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.calculate_rating_score()
returns trigger language plpgsql as $$
begin
  new.overall_score = round((
    new.taste * 0.4 +
    new.texture * 0.2 +
    new.value * 0.2 +
    new.packaging * 0.1 +
    new.buy_again * 0.1
  )::numeric, 1);
  new.review_text = nullif(trim(new.review_text), '');
  return new;
end;
$$;

create trigger snacks_updated_at before update on public.snacks
for each row execute function public.set_updated_at();
create trigger ratings_score before insert or update on public.ratings
for each row execute function public.calculate_rating_score();
create trigger ratings_updated_at before update on public.ratings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.find_duplicate_snacks(
  input_brand text,
  input_product_name text,
  input_flavour text
)
returns setof public.snacks
language sql
stable
security invoker
as $$
  select *
  from public.snacks
  where status = 'approved'
    and normalized_brand = public.normalize_snack_text(input_brand)
    and normalized_product_name = public.normalize_snack_text(input_product_name)
    and normalized_flavour = public.normalize_snack_text(input_flavour)
  limit 5;
$$;

create or replace view public.snack_summaries
with (security_invoker = true)
as
select
  s.id,
  count(r.id)::integer as rating_count,
  round(avg(r.overall_score), 1) as average_score,
  round(avg(r.taste), 1) as average_taste,
  round(avg(r.texture), 1) as average_texture,
  round(avg(r.value), 1) as average_value,
  round(avg(r.packaging), 1) as average_packaging,
  round(avg(r.buy_again), 1) as average_buy_again
from public.snacks s
left join public.ratings r on r.snack_id = s.id
group by s.id;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.snacks enable row level security;
alter table public.snack_categories enable row level security;
alter table public.ratings enable row level security;
alter table public.reports enable row level security;

create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "Categories are public" on public.categories for select using (true);
create policy "Subcategories are public" on public.subcategories for select using (true);

create policy "Approved snacks or own submissions are visible" on public.snacks for select
  using (status = 'approved' or auth.uid() = created_by);
create policy "Authenticated users add snacks" on public.snacks for insert
  to authenticated with check (auth.uid() = created_by);
create policy "Creators update pending snacks" on public.snacks for update
  to authenticated using (auth.uid() = created_by and status = 'pending')
  with check (auth.uid() = created_by and status = 'pending');
create policy "Creators delete pending snacks" on public.snacks for delete
  to authenticated using (auth.uid() = created_by and status = 'pending');

create policy "Snack category links are public" on public.snack_categories for select using (true);
create policy "Creators attach categories" on public.snack_categories for insert
  to authenticated with check (
    exists (
      select 1 from public.snacks
      where id = snack_id and created_by = auth.uid()
    )
  );
create policy "Creators remove categories from pending snacks" on public.snack_categories for delete
  to authenticated using (
    exists (
      select 1 from public.snacks
      where id = snack_id and created_by = auth.uid() and status = 'pending'
    )
  );

create policy "Ratings are public" on public.ratings for select using (true);
create policy "Users add own ratings" on public.ratings for insert
  to authenticated with check (auth.uid() = user_id);
create policy "Users update own ratings" on public.ratings for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own ratings" on public.ratings for delete
  to authenticated using (auth.uid() = user_id);

create policy "Users create own reports" on public.reports for insert
  to authenticated with check (auth.uid() = reporter_id);
create policy "Users see own reports" on public.reports for select
  to authenticated using (auth.uid() = reporter_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'snack-images',
  'snack-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Snack images are public"
on storage.objects for select
using (bucket_id = 'snack-images');

create policy "Users upload to own image folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'snack-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users update own images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'snack-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users delete own images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'snack-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
