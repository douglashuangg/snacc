-- Create user lists table
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 100),
  description text check (description is null or char_length(trim(description)) <= 500),
  cover_image_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create list items join table
create table if not exists public.list_items (
  list_id uuid not null references public.lists(id) on delete cascade,
  snack_id uuid not null references public.snacks(id) on delete cascade,
  position integer not null default 0,
  notes text check (notes is null or char_length(trim(notes)) <= 300),
  created_at timestamptz not null default now(),
  primary key (list_id, snack_id)
);

-- Enable RLS
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

-- Lists policies
create policy "Public or owned lists are visible" on public.lists for select
  using (is_public or auth.uid() = user_id);

create policy "Users create own lists" on public.lists for insert
  to authenticated with check (auth.uid() = user_id);

create policy "Users update own lists" on public.lists for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users delete own lists" on public.lists for delete
  to authenticated using (auth.uid() = user_id);

-- List Items policies
create policy "List items of visible lists are viewable" on public.list_items for select
  using (
    exists (
      select 1 from public.lists
      where id = list_id and (is_public or user_id = auth.uid())
    )
  );

create policy "List owners add items" on public.list_items for insert
  to authenticated with check (
    exists (
      select 1 from public.lists
      where id = list_id and user_id = auth.uid()
    )
  );

create policy "List owners update items" on public.list_items for update
  to authenticated using (
    exists (
      select 1 from public.lists
      where id = list_id and user_id = auth.uid()
    )
  );

create policy "List owners remove items" on public.list_items for delete
  to authenticated using (
    exists (
      select 1 from public.lists
      where id = list_id and user_id = auth.uid()
    )
  );

-- Trigger for updated_at on lists
create trigger lists_updated_at before update on public.lists
  for each row execute function public.set_updated_at();
