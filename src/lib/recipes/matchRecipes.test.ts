import { describe, expect, it } from 'vitest';
import { matchRecipes } from './matchRecipes';
import { prioritizeRecipesUsingItem } from '../../features/recipes/recipeDisplay';
import type { InventoryItem } from '../../types/inventory';
import type {
  CocktailIngredient,
  CocktailRecipe,
  IngredientAlias,
} from '../../types/recipes';

const timestamp = '2026-05-23T00:00:00.000Z';

const recipe: CocktailRecipe = {
  id: 'recipe-1',
  name: 'ジントニック',
  description: 'ジンとトニックウォーターで作る定番の一杯。',
  method: 'build',
  glass_type: 'タンブラー',
  garnish: 'ライム',
  created_at: timestamp,
  updated_at: timestamp,
};

const ingredients: CocktailIngredient[] = [
  {
    id: 'ingredient-1',
    recipe_id: recipe.id,
    ingredient_name: 'ジン',
    ingredient_type: 'alcohol',
    amount: 45,
    unit: 'ml',
    is_required: true,
    substitute_group: null,
    created_at: timestamp,
    updated_at: timestamp,
  },
  {
    id: 'ingredient-2',
    recipe_id: recipe.id,
    ingredient_name: 'トニックウォーター',
    ingredient_type: 'drink',
    amount: 120,
    unit: 'ml',
    is_required: true,
    substitute_group: null,
    created_at: timestamp,
    updated_at: timestamp,
  },
];

const aliases: IngredientAlias[] = [
  {
    id: 'alias-1',
    canonical_name: 'ジン',
    alias_name: 'ドライジン',
    created_at: timestamp,
  },
  {
    id: 'alias-2',
    canonical_name: 'ジン',
    alias_name: 'gin',
    created_at: timestamp,
  },
];

const baseItem: InventoryItem = {
  id: 'item-1',
  name: 'ボトル',
  item_type: 'alcohol',
  category: 'ドライジン',
  sub_category: null,
  alcohol_percentage: 40,
  volume_ml: 700,
  remaining_ml: 100,
  image_url: null,
  memo: null,
  display_order: null,
  created_at: timestamp,
  updated_at: timestamp,
};

const tonicItem: InventoryItem = {
  ...baseItem,
  id: 'item-2',
  name: 'トニックウォーター',
  item_type: 'drink',
  category: 'トニックウォーター',
  alcohol_percentage: null,
  volume_ml: 500,
  remaining_ml: 500,
};

describe('matchRecipes', () => {
  it('returns makeable for seed-like gin tonic ingredients', () => {
    const results = matchRecipes({
      inventoryItems: [baseItem, tonicItem],
      cocktailRecipes: [recipe],
      cocktailIngredients: ingredients,
      ingredientAliases: aliases,
    });

    expect(results[0]).toEqual({
      recipeId: recipe.id,
      status: 'makeable',
      missingIngredients: [],
    });
  });

  it('returns near when tonic water is missing', () => {
    const results = matchRecipes({
      inventoryItems: [baseItem],
      cocktailRecipes: [recipe],
      cocktailIngredients: ingredients,
      ingredientAliases: aliases,
      nearThreshold: 1,
    });

    expect(results[0]?.status).toBe('near');
    expect(results[0]?.missingIngredients).toEqual(['トニックウォーター']);
  });

  it('matches inventory names through aliases', () => {
    const results = matchRecipes({
      inventoryItems: [
        {
          ...baseItem,
          name: 'GIN',
          category: null,
        },
        tonicItem,
      ],
      cocktailRecipes: [recipe],
      cocktailIngredients: ingredients,
      ingredientAliases: aliases,
    });

    expect(results[0]?.status).toBe('makeable');
  });

  it('treats remaining_ml = 0 ingredients as unavailable', () => {
    const results = matchRecipes({
      inventoryItems: [
        {
          ...baseItem,
          remaining_ml: 0,
        },
        tonicItem,
      ],
      cocktailRecipes: [recipe],
      cocktailIngredients: ingredients,
      ingredientAliases: aliases,
      nearThreshold: 1,
    });

    expect(results[0]).toEqual({
      recipeId: recipe.id,
      status: 'near',
      missingIngredients: ['ジン'],
    });
  });

  it('prioritizes makeable recipes that use the target item', () => {
    const orangeRecipe: CocktailRecipe = {
      ...recipe,
      id: 'recipe-2',
      name: 'スクリュードライバー',
      garnish: null,
    };
    const orangeIngredients: CocktailIngredient[] = [
      {
        ...ingredients[0],
        id: 'ingredient-3',
        recipe_id: orangeRecipe.id,
        ingredient_name: 'ウォッカ',
      },
      {
        ...ingredients[1],
        id: 'ingredient-4',
        recipe_id: orangeRecipe.id,
        ingredient_name: 'オレンジジュース',
      },
    ];
    const vodkaItem: InventoryItem = {
      ...baseItem,
      id: 'item-3',
      name: 'ウォッカ',
      category: 'ウォッカ',
    };
    const orangeItem: InventoryItem = {
      ...tonicItem,
      id: 'item-4',
      name: 'オレンジジュース',
      category: 'オレンジジュース',
    };
    const recipes = [orangeRecipe, recipe];
    const allIngredients = [...ingredients, ...orangeIngredients];
    const results = matchRecipes({
      inventoryItems: [baseItem, tonicItem, vodkaItem, orangeItem],
      cocktailRecipes: recipes,
      cocktailIngredients: allIngredients,
      ingredientAliases: aliases,
    });

    const prioritized = prioritizeRecipesUsingItem(
      recipes,
      results,
      baseItem,
      allIngredients,
      aliases,
    );

    expect(prioritized.map((item) => item.recipe.name)).toEqual([
      'ジントニック',
      'スクリュードライバー',
    ]);
    expect(prioritized[0]?.usesTargetItem).toBe(true);
  });
});
