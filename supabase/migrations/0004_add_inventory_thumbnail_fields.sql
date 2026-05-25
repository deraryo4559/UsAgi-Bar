alter table public.inventory_items
  add column if not exists thumbnail_url text,
  add column if not exists thumbnail_prompt text,
  add column if not exists thumbnail_provider text,
  add column if not exists thumbnail_generated_at timestamptz;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'inventory-thumbnails',
  'inventory-thumbnails',
  true,
  2097152,
  array['image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Inventory thumbnails are publicly readable"
on storage.objects;

create policy "Inventory thumbnails are publicly readable"
on storage.objects
for select
using (bucket_id = 'inventory-thumbnails');

drop policy if exists "Admins can upload inventory thumbnails"
on storage.objects;

create policy "Admins can upload inventory thumbnails"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'inventory-thumbnails'
  and public.is_admin()
);

drop policy if exists "Admins can update inventory thumbnails"
on storage.objects;

create policy "Admins can update inventory thumbnails"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'inventory-thumbnails'
  and public.is_admin()
)
with check (
  bucket_id = 'inventory-thumbnails'
  and public.is_admin()
);

drop policy if exists "Admins can delete inventory thumbnails"
on storage.objects;

create policy "Admins can delete inventory thumbnails"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'inventory-thumbnails'
  and public.is_admin()
);
