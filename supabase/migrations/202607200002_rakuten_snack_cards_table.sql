-- Replace the ops view with a real table for easy browsing in Supabase.
drop view if exists public.rakuten_snack_cards;

create table public.rakuten_snack_cards (
  snack_id uuid primary key references public.snacks(id) on delete cascade,
  name_ja text,
  brand text,
  image_url text,
  genre_id text,
  genre_name text,
  genre_path text[],
  updated_at timestamptz not null default now()
);

create index rakuten_snack_cards_brand_idx on public.rakuten_snack_cards (brand);
create index rakuten_snack_cards_genre_idx on public.rakuten_snack_cards (genre_id);

alter table public.rakuten_snack_cards enable row level security;

create policy "Approved Rakuten snack cards are public"
on public.rakuten_snack_cards for select
using (
  exists (
    select 1
    from public.snacks
    where snacks.id = rakuten_snack_cards.snack_id
      and snacks.source_type = 'rakuten'
      and snacks.status = 'approved'
  )
);

grant select on public.rakuten_snack_cards to anon, authenticated;
