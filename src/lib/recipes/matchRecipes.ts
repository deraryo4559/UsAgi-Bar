import type { InventoryItem } from '../../types/inventory';
import type {
  CocktailIngredient,
  CocktailRecipe,
  IngredientAlias,
  RecipeMatchResult,
} from '../../types/recipes';

export type MatchRecipesInput = {
  inventoryItems: InventoryItem[];
  cocktailRecipes: CocktailRecipe[];
  cocktailIngredients: CocktailIngredient[];
  ingredientAliases: IngredientAlias[];
  nearThreshold?: number;
};

function compactNormalize(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function buildAliasMap(ingredientAliases: IngredientAlias[]) {
  const aliases = new Map<string, string>();

  ingredientAliases.forEach((alias) => {
    const canonical = compactNormalize(alias.canonical_name);
    aliases.set(canonical, canonical);
    aliases.set(compactNormalize(alias.alias_name), canonical);
  });

  return aliases;
}

export function normalizeIngredientName(
  value: string,
  ingredientAliases: IngredientAlias[] = [],
) {
  const normalized = compactNormalize(value);
  const aliases = buildAliasMap(ingredientAliases);
  return aliases.get(normalized) ?? normalized;
}

export function getInventoryItemSearchNames(
  item: InventoryItem,
  ingredientAliases: IngredientAlias[] = [],
) {
  const names = [item.name, item.category, item.sub_category]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeIngredientName(value, ingredientAliases));

  return new Set(names);
}

function hasRemaining(item: InventoryItem) {
  return item.remaining_ml === null || item.remaining_ml > 0;
}

function groupRequiredIngredients(ingredients: CocktailIngredient[]) {
  return ingredients.reduce<Map<string, CocktailIngredient[]>>(
    (groups, ingredient) => {
      if (!ingredient.is_required) {
        return groups;
      }

      const key = ingredient.substitute_group
        ? `substitute:${ingredient.substitute_group}`
        : `ingredient:${ingredient.id}`;
      const group = groups.get(key) ?? [];
      group.push(ingredient);
      groups.set(key, group);
      return groups;
    },
    new Map(),
  );
}

export function matchRecipes({
  inventoryItems,
  cocktailRecipes,
  cocktailIngredients,
  ingredientAliases,
  nearThreshold = 1,
}: MatchRecipesInput): RecipeMatchResult[] {
  const availableNames = new Set<string>();

  inventoryItems.filter(hasRemaining).forEach((item) => {
    getInventoryItemSearchNames(item, ingredientAliases).forEach((name) => {
      availableNames.add(name);
    });
  });

  const ingredientsByRecipeId = cocktailIngredients.reduce<
    Map<string, CocktailIngredient[]>
  >((groups, ingredient) => {
    const group = groups.get(ingredient.recipe_id) ?? [];
    group.push(ingredient);
    groups.set(ingredient.recipe_id, group);
    return groups;
  }, new Map());

  return cocktailRecipes.map((recipe) => {
    const ingredients = ingredientsByRecipeId.get(recipe.id) ?? [];
    const requiredGroups = groupRequiredIngredients(ingredients);
    const missingIngredients: string[] = [];

    requiredGroups.forEach((ingredientGroup) => {
      const isSatisfied = ingredientGroup.some((ingredient) =>
        availableNames.has(
          normalizeIngredientName(
            ingredient.ingredient_name,
            ingredientAliases,
          ),
        ),
      );

      if (!isSatisfied) {
        missingIngredients.push(
          ingredientGroup
            .map((ingredient) => ingredient.ingredient_name)
            .filter((value, index, values) => values.indexOf(value) === index)
            .join(' / '),
        );
      }
    });

    const status =
      missingIngredients.length === 0
        ? 'makeable'
        : missingIngredients.length <= nearThreshold
          ? 'near'
          : 'not_makeable';

    return {
      recipeId: recipe.id,
      status,
      missingIngredients,
    };
  });
}
