-- Ops/debug card shape for approved Rakuten snacks (app still reads snacks).
create or replace view public.rakuten_snack_cards
with (security_invoker = true)
as
select
  s.id,
  s.name_ja,
  coalesce(nullif(trim(s.maker_name), ''), nullif(trim(s.brand), '')) as brand,
  s.image_url,
  g.genre_id,
  g.name_ja as genre_name,
  g.path_ja as genre_path
from public.snacks s
left join lateral (
  select sg.genre_id
  from public.snack_rakuten_genres sg
  where sg.snack_id = s.id
  order by sg.genre_id
  limit 1
) primary_genre on true
left join public.rakuten_genres g on g.genre_id = primary_genre.genre_id
where s.source_type = 'rakuten'
  and s.status = 'approved';

grant select on public.rakuten_snack_cards to anon, authenticated;
