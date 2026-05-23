begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  item_type text not null check (item_type in ('alcohol', 'drink', 'mixer', 'other')),
  category text,
  sub_category text,
  alcohol_percentage numeric check (alcohol_percentage is null or (alcohol_percentage >= 0 and alcohol_percentage <= 100)),
  volume_ml numeric check (volume_ml is null or volume_ml >= 0),
  remaining_ml numeric check (remaining_ml is null or remaining_ml >= 0),
  image_url text,
  memo text,
  display_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cocktail_recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  method text,
  glass_type text,
  garnish text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cocktail_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.cocktail_recipes(id) on delete cascade,
  ingredient_name text not null,
  ingredient_type text,
  amount numeric check (amount is null or amount >= 0),
  unit text,
  is_required boolean not null default true,
  substitute_group text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingredient_aliases (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  alias_name text not null,
  created_at timestamptz not null default now(),
  unique (canonical_name, alias_name)
);

create table if not exists public.recipe_matches (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  recipe_id uuid not null references public.cocktail_recipes(id) on delete cascade,
  match_status text not null check (match_status in ('makeable', 'near', 'not_makeable')),
  missing_ingredients jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inventory_item_id, recipe_id)
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists inventory_items_display_order_idx on public.inventory_items(display_order);
create index if not exists inventory_items_item_type_idx on public.inventory_items(item_type);
create index if not exists cocktail_ingredients_recipe_id_idx on public.cocktail_ingredients(recipe_id);
create index if not exists ingredient_aliases_alias_name_idx on public.ingredient_aliases(alias_name);
create index if not exists recipe_matches_inventory_item_id_idx on public.recipe_matches(inventory_item_id);
create index if not exists recipe_matches_recipe_id_idx on public.recipe_matches(recipe_id);
create index if not exists recipe_matches_status_idx on public.recipe_matches(match_status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists set_cocktail_recipes_updated_at on public.cocktail_recipes;
create trigger set_cocktail_recipes_updated_at
before update on public.cocktail_recipes
for each row execute function public.set_updated_at();

drop trigger if exists set_cocktail_ingredients_updated_at on public.cocktail_ingredients;
create trigger set_cocktail_ingredients_updated_at
before update on public.cocktail_ingredients
for each row execute function public.set_updated_at();

drop trigger if exists set_recipe_matches_updated_at on public.recipe_matches;
create trigger set_recipe_matches_updated_at
before update on public.recipe_matches
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

insert into storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'inventory-images',
    'inventory-images',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.inventory_items enable row level security;
alter table public.cocktail_recipes enable row level security;
alter table public.cocktail_ingredients enable row level security;
alter table public.ingredient_aliases enable row level security;
alter table public.recipe_matches enable row level security;

drop policy if exists "Profiles are readable by owner or admin" on public.profiles;
create policy "Profiles are readable by owner or admin"
on public.profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can create own viewer profile" on public.profiles;
create policy "Users can create own viewer profile"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid() and role = 'viewer');

drop policy if exists "Admins can create profiles" on public.profiles;
create policy "Admins can create profiles"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
on public.profiles
for delete
to authenticated
using (public.is_admin());

comment on table public.profiles is
  '初回admin付与はSupabase SQL Editor等で明示的に行う。通常ユーザーは自分自身をadminに昇格できないRLSにしている。';

drop policy if exists "Inventory items are publicly readable" on public.inventory_items;
create policy "Inventory items are publicly readable"
on public.inventory_items
for select
using (true);

drop policy if exists "Admins can insert inventory items" on public.inventory_items;
create policy "Admins can insert inventory items"
on public.inventory_items
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update inventory items" on public.inventory_items;
create policy "Admins can update inventory items"
on public.inventory_items
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete inventory items" on public.inventory_items;
create policy "Admins can delete inventory items"
on public.inventory_items
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Cocktail recipes are publicly readable" on public.cocktail_recipes;
create policy "Cocktail recipes are publicly readable"
on public.cocktail_recipes
for select
using (true);

drop policy if exists "Admins can insert cocktail recipes" on public.cocktail_recipes;
create policy "Admins can insert cocktail recipes"
on public.cocktail_recipes
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update cocktail recipes" on public.cocktail_recipes;
create policy "Admins can update cocktail recipes"
on public.cocktail_recipes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete cocktail recipes" on public.cocktail_recipes;
create policy "Admins can delete cocktail recipes"
on public.cocktail_recipes
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Cocktail ingredients are publicly readable" on public.cocktail_ingredients;
create policy "Cocktail ingredients are publicly readable"
on public.cocktail_ingredients
for select
using (true);

drop policy if exists "Admins can insert cocktail ingredients" on public.cocktail_ingredients;
create policy "Admins can insert cocktail ingredients"
on public.cocktail_ingredients
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update cocktail ingredients" on public.cocktail_ingredients;
create policy "Admins can update cocktail ingredients"
on public.cocktail_ingredients
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete cocktail ingredients" on public.cocktail_ingredients;
create policy "Admins can delete cocktail ingredients"
on public.cocktail_ingredients
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Ingredient aliases are publicly readable" on public.ingredient_aliases;
create policy "Ingredient aliases are publicly readable"
on public.ingredient_aliases
for select
using (true);

drop policy if exists "Admins can insert ingredient aliases" on public.ingredient_aliases;
create policy "Admins can insert ingredient aliases"
on public.ingredient_aliases
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update ingredient aliases" on public.ingredient_aliases;
create policy "Admins can update ingredient aliases"
on public.ingredient_aliases
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete ingredient aliases" on public.ingredient_aliases;
create policy "Admins can delete ingredient aliases"
on public.ingredient_aliases
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Recipe matches are publicly readable" on public.recipe_matches;
create policy "Recipe matches are publicly readable"
on public.recipe_matches
for select
using (true);

drop policy if exists "Admins can insert recipe matches" on public.recipe_matches;
create policy "Admins can insert recipe matches"
on public.recipe_matches
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update recipe matches" on public.recipe_matches;
create policy "Admins can update recipe matches"
on public.recipe_matches
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete recipe matches" on public.recipe_matches;
create policy "Admins can delete recipe matches"
on public.recipe_matches
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Inventory images are publicly readable" on storage.objects;
create policy "Inventory images are publicly readable"
on storage.objects
for select
using (bucket_id = 'inventory-images');

drop policy if exists "Admins can upload inventory images" on storage.objects;
create policy "Admins can upload inventory images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'inventory-images' and public.is_admin());

drop policy if exists "Admins can update inventory images" on storage.objects;
create policy "Admins can update inventory images"
on storage.objects
for update
to authenticated
using (bucket_id = 'inventory-images' and public.is_admin())
with check (bucket_id = 'inventory-images' and public.is_admin());

drop policy if exists "Admins can delete inventory images" on storage.objects;
create policy "Admins can delete inventory images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'inventory-images' and public.is_admin());

commit;
