begin;

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
    '40000000-0000-0000-0000-000000000101',
    'ソーダ',
    'drink',
    'ソーダ',
    null,
    null,
    500,
    500,
    null,
    'makeable確認用の割材在庫',
    101
  ),
  (
    '40000000-0000-0000-0000-000000000102',
    '牛乳',
    'drink',
    '牛乳',
    null,
    null,
    1000,
    1000,
    null,
    'makeable確認用の割材在庫',
    102
  ),
  (
    '40000000-0000-0000-0000-000000000103',
    'オレンジジュース',
    'drink',
    'オレンジジュース',
    null,
    null,
    1000,
    1000,
    null,
    'makeable確認用の割材在庫',
    103
  ),
  (
    '40000000-0000-0000-0000-000000000104',
    'コーラ',
    'drink',
    'コーラ',
    null,
    null,
    500,
    500,
    null,
    'makeable確認用の割材在庫',
    104
  ),
  (
    '40000000-0000-0000-0000-000000000105',
    'ジンジャーエール',
    'drink',
    'ジンジャーエール',
    null,
    null,
    500,
    500,
    null,
    'makeable確認用の割材在庫',
    105
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
  display_order = excluded.display_order,
  updated_at = now();

commit;
