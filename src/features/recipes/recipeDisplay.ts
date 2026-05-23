import type { InventoryItem } from '../../types/inventory';
import type {
  CocktailIngredient,
  CocktailRecipe,
  IngredientAlias,
  RecipeMatchResult,
} from '../../types/recipes';
import {
  getInventoryItemSearchNames,
  normalizeIngredientName,
} from '../../lib/recipes/matchRecipes';

export type RecipeDisplayItem = {
  recipe: CocktailRecipe;
  match: RecipeMatchResult;
  ingredients: CocktailIngredient[];
  usesTargetItem: boolean;
};

export function getRecipeIngredientsByRecipeId(
  cocktailIngredients: CocktailIngredient[],
) {
  return cocktailIngredients.reduce<Map<string, CocktailIngredient[]>>(
    (ingredientsByRecipeId, ingredient) => {
      const ingredients = ingredientsByRecipeId.get(ingredient.recipe_id) ?? [];
      ingredients.push(ingredient);
      ingredientsByRecipeId.set(ingredient.recipe_id, ingredients);
      return ingredientsByRecipeId;
    },
    new Map(),
  );
}

export function getRecipeIdsUsingItem(
  item: InventoryItem,
  cocktailIngredients: CocktailIngredient[],
  ingredientAliases: IngredientAlias[],
) {
  const itemSearchNames = getInventoryItemSearchNames(item, ingredientAliases);

  return new Set(
    cocktailIngredients
      .filter((ingredient) =>
        itemSearchNames.has(
          normalizeIngredientName(
            ingredient.ingredient_name,
            ingredientAliases,
          ),
        ),
      )
      .map((ingredient) => ingredient.recipe_id),
  );
}

export function prioritizeRecipesUsingItem(
  recipes: CocktailRecipe[],
  matches: RecipeMatchResult[],
  targetItem: InventoryItem,
  cocktailIngredients: CocktailIngredient[],
  ingredientAliases: IngredientAlias[],
) {
  const ingredientsByRecipeId =
    getRecipeIngredientsByRecipeId(cocktailIngredients);
  const recipeIdsUsingItem = getRecipeIdsUsingItem(
    targetItem,
    cocktailIngredients,
    ingredientAliases,
  );
  const matchByRecipeId = new Map(
    matches.map((match) => [match.recipeId, match]),
  );

  return recipes
    .map((recipe): RecipeDisplayItem | null => {
      const match = matchByRecipeId.get(recipe.id);

      if (!match || match.status === 'not_makeable') {
        return null;
      }

      return {
        recipe,
        match,
        ingredients: ingredientsByRecipeId.get(recipe.id) ?? [],
        usesTargetItem: recipeIdsUsingItem.has(recipe.id),
      };
    })
    .filter((item): item is RecipeDisplayItem => item !== null)
    .sort((a, b) => {
      if (a.usesTargetItem !== b.usesTargetItem) {
        return a.usesTargetItem ? -1 : 1;
      }

      if (a.match.status !== b.match.status) {
        return a.match.status === 'makeable' ? -1 : 1;
      }

      return a.recipe.name.localeCompare(b.recipe.name, 'ja');
    });
}

export function splitRecipeMatchesByStatus(items: RecipeDisplayItem[]) {
  return {
    makeable: items.filter((item) => item.match.status === 'makeable'),
    near: items.filter((item) => item.match.status === 'near'),
  };
}

export function formatMissingIngredients(missingIngredients: string[]) {
  if (missingIngredients.length === 0) {
    return '';
  }

  return `あと ${missingIngredients.join('、')} があれば作れます`;
}

export function formatIngredientAmount(ingredient: CocktailIngredient) {
  if (ingredient.amount === null && !ingredient.unit) {
    return '';
  }

  return `${ingredient.amount ?? ''}${ingredient.unit ?? ''}`;
}
