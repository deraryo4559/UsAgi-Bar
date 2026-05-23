import { supabase } from '../../../lib/supabase/client';
import { ensureSupabaseConfig, toErrorMessage } from '../../../lib/supabase/errors';

function throwIfError(error: unknown) {
  if (error) {
    throw new Error(toErrorMessage(error));
  }
}

export async function listCocktailRecipes() {
  ensureSupabaseConfig();

  const { data, error } = await supabase
    .from('cocktail_recipes')
    .select('*')
    .order('name', { ascending: true });

  throwIfError(error);
  return data ?? [];
}

export async function listCocktailIngredients() {
  ensureSupabaseConfig();

  const { data, error } = await supabase
    .from('cocktail_ingredients')
    .select('*')
    .order('created_at', { ascending: true });

  throwIfError(error);
  return data ?? [];
}

export async function listIngredientAliases() {
  ensureSupabaseConfig();

  const { data, error } = await supabase
    .from('ingredient_aliases')
    .select('*')
    .order('canonical_name', { ascending: true })
    .order('alias_name', { ascending: true });

  throwIfError(error);
  return data ?? [];
}

export async function fetchRecipeCatalog() {
  const [cocktailRecipes, cocktailIngredients, ingredientAliases] =
    await Promise.all([
      listCocktailRecipes(),
      listCocktailIngredients(),
      listIngredientAliases(),
    ]);

  return {
    cocktailRecipes,
    cocktailIngredients,
    ingredientAliases,
  };
}
