begin;

do $$
begin
  if public.normalize_snack_text('抹茶') = ''
    or public.normalize_snack_text('抹茶') = public.normalize_snack_text('いちご') then
    raise exception 'Japanese normalization erased product identity';
  end if;
end;
$$;

insert into public.snacks (
  id,
  source_type,
  rakuten_product_id,
  jan_code,
  name_ja,
  normalized_name_ja,
  status,
  source_first_seen_at,
  source_last_seen_at
) values (
  'e1000000-0000-4000-8000-000000000001',
  'rakuten',
  'test-product-1',
  '4900000000001',
  '抹茶チョコ',
  '抹茶チョコ',
  'pending',
  now(),
  now()
);

do $$
begin
  begin
    insert into public.snacks (source_type, rakuten_product_id, status)
    values ('rakuten', 'test-product-1', 'pending');
    raise exception 'duplicate Rakuten product ID was accepted';
  exception when unique_violation then
    null;
  end;

  begin
    insert into public.snacks (source_type, rakuten_product_id, status)
    values ('rakuten', 'test-incomplete-approved', 'approved');
    raise exception 'incomplete approved snack was accepted';
  exception when check_violation then
    null;
  end;
end;
$$;

insert into public.snack_images (
  snack_id,
  image_url,
  source_api,
  source_key,
  is_primary
) values (
  'e1000000-0000-4000-8000-000000000001',
  'https://example.com/image.jpg',
  'product_search',
  'test-product-1',
  true
);

do $$
begin
  begin
    insert into public.snack_images (
      snack_id,
      image_url,
      source_api,
      source_key
    ) values (
      'e1000000-0000-4000-8000-000000000001',
      'https://example.com/image.jpg',
      'product_search',
      'test-product-1'
    );
    raise exception 'duplicate image was accepted';
  exception when unique_violation then
    null;
  end;
end;
$$;

insert into public.snack_tags (
  snack_id,
  tag_type,
  tag_key,
  display_name,
  confidence,
  source_field,
  evidence_text,
  parser_version
) values (
  'e1000000-0000-4000-8000-000000000001',
  'flavour',
  'matcha',
  'Matcha',
  0.95,
  'productName',
  '抹茶',
  'ja-snacks-v1'
);

update public.snack_tags
set is_admin_verified = true
where snack_id = 'e1000000-0000-4000-8000-000000000001'
  and tag_key = 'matcha';

delete from public.snack_tags
where snack_id = 'e1000000-0000-4000-8000-000000000001'
  and not is_admin_verified;

do $$
begin
  if not exists (
    select 1 from public.snack_tags
    where snack_id = 'e1000000-0000-4000-8000-000000000001'
      and tag_key = 'matcha'
      and is_admin_verified
  ) then
    raise exception 'verified parser tag did not survive reparse cleanup';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.snack_tags (
      snack_id,
      tag_type,
      tag_key,
      display_name,
      confidence,
      source_field,
      parser_version
    ) values (
      'e1000000-0000-4000-8000-000000000001',
      'flavour',
      'matcha',
      'Matcha',
      0.95,
      'productName',
      'ja-snacks-v1'
    );
    raise exception 'duplicate parser tag was accepted';
  exception when unique_violation then
    null;
  end;
end;
$$;

rollback;
