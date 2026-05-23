export type RecipeMatchStatus = 'makeable' | 'near' | 'not_makeable';

export type CocktailRecipe = {
  id: string;
  name: string;
  description: string | null;
  method: string | null;
  glass_type: string | null;
  garnish: string | null;
  created_at: string;
  updated_at: string;
};

export type CocktailIngredient = {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  ingredient_type: string | null;
  amount: number | null;
  unit: string | null;
  is_required: boolean;
  substitute_group: string | null;
  created_at: string;
  updated_at: string;
};

export type IngredientAlias = {
  id: string;
  canonical_name: string;
  alias_name: string;
  created_at: string;
};

export type RecipeMatchResult = {
  recipeId: string;
  status: RecipeMatchStatus;
  missingIngredients: string[];
};
