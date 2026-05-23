select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'inventory_items',
    'cocktail_recipes',
    'cocktail_ingredients',
    'ingredient_aliases',
    'recipe_matches'
  )
order by tablename;

select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname in ('public', 'storage')
  and tablename in (
    'profiles',
    'inventory_items',
    'cocktail_recipes',
    'cocktail_ingredients',
    'ingredient_aliases',
    'recipe_matches',
    'objects'
  )
order by schemaname, tablename, policyname;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'inventory-images';
