insert into public.categories (id, name, slug) values
  ('11111111-1111-4111-8111-111111111111', 'Sweet', 'sweet'),
  ('22222222-2222-4222-8222-222222222222', 'Salty', 'salty'),
  ('33333333-3333-4333-8333-333333333333', 'Sour', 'sour'),
  ('44444444-4444-4444-8444-444444444444', 'Spicy', 'spicy'),
  ('55555555-5555-4555-8555-555555555555', 'Savoury', 'savoury'),
  ('66666666-6666-4666-8666-666666666666', 'Bitter', 'bitter'),
  ('77777777-7777-4777-8777-777777777777', 'Umami', 'umami')
on conflict (id) do update set name = excluded.name, slug = excluded.slug;

insert into public.subcategories (id, name, slug) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Chips', 'chips'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Chocolate', 'chocolate'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'Candy', 'candy'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Gummies', 'gummies'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'Cookies', 'cookies'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 'Crackers', 'crackers'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', 'Popcorn', 'popcorn'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'Nuts', 'nuts'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9', 'Protein Snacks', 'protein-snacks'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10', 'Baked Goods', 'baked-goods'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', 'Frozen Treats', 'frozen-treats'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12', 'Other', 'other')
on conflict (id) do update set name = excluded.name, slug = excluded.slug;

insert into public.snacks (
  id, brand, product_name, flavour, description, image_url, subcategory_id, price_level, status, created_at
) values
  ('d1000000-0000-4000-8000-000000000001', 'Doritos', 'Tortilla Chips', 'Sweet Chili Heat', 'Bold sweet heat with a crisp corn crunch.', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 2, 'approved', '2026-01-08'),
  ('d1000000-0000-4000-8000-000000000002', 'Hi-Chew', 'Fruit Chews', 'Green Apple', 'Long-lasting chewy candy with tart apple flavour.', 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 1, 'approved', '2026-01-12'),
  ('d1000000-0000-4000-8000-000000000003', 'Tony''s Chocolonely', 'Milk Chocolate', 'Caramel Sea Salt', 'Chunky milk chocolate with caramel pieces and sea salt.', 'https://images.unsplash.com/photo-1575377427642-087cf684f29d?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 3, 'approved', '2026-02-02'),
  ('d1000000-0000-4000-8000-000000000004', 'Oreo', 'Sandwich Cookies', 'Birthday Cake', 'Cocoa cookies with colourful birthday cake creme.', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 2, 'approved', '2026-02-20'),
  ('d1000000-0000-4000-8000-000000000005', 'Takis', 'Rolled Tortilla Chips', 'Fuego', 'Intense hot chili pepper and lime.', 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 2, 'approved', '2026-03-01'),
  ('d1000000-0000-4000-8000-000000000006', 'Lindt', 'Excellence Bar', '70% Dark Chocolate', 'Smooth dark chocolate with a balanced cocoa finish.', 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 3, 'approved', '2026-03-04'),
  ('d1000000-0000-4000-8000-000000000007', 'Sour Patch Kids', 'Soft Candy', 'Original', 'Sour first, then sweet fruit candy.', 'https://images.unsplash.com/photo-1575224300306-1b8da36134ec?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 1, 'approved', '2026-03-12'),
  ('d1000000-0000-4000-8000-000000000008', 'Cheez-It', 'Baked Crackers', 'Extra Toasty', 'Deeply toasted cheesy square crackers.', 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 1, 'approved', '2026-03-18'),
  ('d1000000-0000-4000-8000-000000000009', 'Smartfood', 'Popcorn', 'White Cheddar', 'Air-popped popcorn dusted with white cheddar.', 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', 2, 'approved', '2026-04-02'),
  ('d1000000-0000-4000-8000-000000000010', 'Blue Diamond', 'Almonds', 'Smokehouse', 'Crunchy almonds with a smoky savoury seasoning.', 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 2, 'approved', '2026-04-09'),
  ('d1000000-0000-4000-8000-000000000011', 'Quest', 'Protein Bar', 'Cookies & Cream', 'High-protein chewy bar with cookie pieces.', 'https://images.unsplash.com/photo-1622484212110-0c65f49e6ec6?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9', 3, 'approved', '2026-04-16'),
  ('d1000000-0000-4000-8000-000000000012', 'Little Debbie', 'Snack Cake', 'Cosmic Brownie', 'Fudgy brownie topped with chocolate and candy chips.', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10', 1, 'approved', '2026-05-01'),
  ('d1000000-0000-4000-8000-000000000013', 'Häagen-Dazs', 'Ice Cream', 'Coffee', 'Dense, creamy coffee ice cream.', 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', 3, 'approved', '2026-05-08'),
  ('d1000000-0000-4000-8000-000000000014', 'Pringles', 'Potato Crisps', 'Pizza', 'Stackable crisps with tomato and herb seasoning.', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 2, 'approved', '2026-05-20'),
  ('d1000000-0000-4000-8000-000000000015', 'Haribo', 'Goldbears', 'Original', 'Classic firm and fruity gummy bears.', 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=900', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 1, 'approved', '2026-06-03')
on conflict (id) do update set
  brand = excluded.brand,
  product_name = excluded.product_name,
  flavour = excluded.flavour,
  description = excluded.description,
  image_url = excluded.image_url,
  subcategory_id = excluded.subcategory_id,
  price_level = excluded.price_level;

insert into public.snack_categories (snack_id, category_id) values
  ('d1000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222'),
  ('d1000000-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444'),
  ('d1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111'),
  ('d1000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333'),
  ('d1000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111'),
  ('d1000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222'),
  ('d1000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111'),
  ('d1000000-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222'),
  ('d1000000-0000-4000-8000-000000000005', '33333333-3333-4333-8333-333333333333'),
  ('d1000000-0000-4000-8000-000000000005', '44444444-4444-4444-8444-444444444444'),
  ('d1000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111'),
  ('d1000000-0000-4000-8000-000000000006', '66666666-6666-4666-8666-666666666666'),
  ('d1000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111'),
  ('d1000000-0000-4000-8000-000000000007', '33333333-3333-4333-8333-333333333333'),
  ('d1000000-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222'),
  ('d1000000-0000-4000-8000-000000000008', '55555555-5555-4555-8555-555555555555'),
  ('d1000000-0000-4000-8000-000000000009', '22222222-2222-4222-8222-222222222222'),
  ('d1000000-0000-4000-8000-000000000010', '22222222-2222-4222-8222-222222222222'),
  ('d1000000-0000-4000-8000-000000000010', '55555555-5555-4555-8555-555555555555'),
  ('d1000000-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111'),
  ('d1000000-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111'),
  ('d1000000-0000-4000-8000-000000000013', '11111111-1111-4111-8111-111111111111'),
  ('d1000000-0000-4000-8000-000000000013', '66666666-6666-4666-8666-666666666666'),
  ('d1000000-0000-4000-8000-000000000014', '22222222-2222-4222-8222-222222222222'),
  ('d1000000-0000-4000-8000-000000000014', '55555555-5555-4555-8555-555555555555'),
  ('d1000000-0000-4000-8000-000000000015', '11111111-1111-4111-8111-111111111111')
on conflict do nothing;
