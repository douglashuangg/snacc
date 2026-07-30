create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  snack_id uuid not null references public.snacks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, snack_id)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  snack_id uuid not null references public.snacks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, snack_id)
);

alter table public.bookmarks enable row level security;
alter table public.favorites enable row level security;

create policy "Bookmarks visible to owner" on public.bookmarks for select
  to authenticated using (auth.uid() = user_id);
create policy "Users create own bookmarks" on public.bookmarks for insert
  to authenticated with check (auth.uid() = user_id);
create policy "Users delete own bookmarks" on public.bookmarks for delete
  to authenticated using (auth.uid() = user_id);

create policy "Favorites visible to owner" on public.favorites for select
  to authenticated using (auth.uid() = user_id);
create policy "Users create own favorites" on public.favorites for insert
  to authenticated with check (auth.uid() = user_id);
create policy "Users delete own favorites" on public.favorites for delete
  to authenticated using (auth.uid() = user_id);
