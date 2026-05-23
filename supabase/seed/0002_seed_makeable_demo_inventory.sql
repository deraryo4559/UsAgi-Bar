begin;

insert into public.ingredient_aliases
  (id, canonical_name, alias_name)
values
  ('30000000-0000-0000-0000-000000000020', 'ジン', 'gin')
on conflict (canonical_name, alias_name) do nothing;

insert into public.inventory_items
  (
    id,
    name,
    item_type,
    category,
    sub_category,
    alcohol_percentage,
    volume_ml,
    remaining_ml,
    image_url,
    memo,
    display_order
  )
values
  (
    '40000000-0000-0000-0000-000000000001',
    'トニックウォーター',
    'drink',
    'トニックウォーター',
    null,
    null,
    500,
    500,
    null,
    'makeable確認用のサンプル在庫',
    20
  )
on conflict (id) do update
set
  name = excluded.name,
  item_type = excluded.item_type,
  category = excluded.category,
  sub_category = excluded.sub_category,
  alcohol_percentage = excluded.alcohol_percentage,
  volume_ml = excluded.volume_ml,
  remaining_ml = excluded.remaining_ml,
  image_url = excluded.image_url,
  memo = excluded.memo,
  display_order = excluded.display_order;

commit;
