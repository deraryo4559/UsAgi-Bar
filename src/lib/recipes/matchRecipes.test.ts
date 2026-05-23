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

const homeBarAliases: IngredientAlias[] = [
  ...aliases,
  {
    id: 'alias-sui',
    canonical_name: 'ジン',
    alias_name: 'SUNTORY GIN SUI',
    created_at: timestamp,
  },
  {
    id: 'alias-shochu',
    canonical_name: '焼酎',
    alias_name: '三岳',
    created_at: timestamp,
  },
  {
    id: 'alias-kahlua',
    canonical_name: 'コーヒーリキュール',
    alias_name: 'Kahlúa',
    created_at: timestamp,
  },
  {
    id: 'alias-sake',
    canonical_name: '日本酒',
    alias_name: '浦霞',
    created_at: timestamp,
  },
  {
    id: 'alias-whisky',
    canonical_name: 'ウイスキー',
    alias_name: '角瓶',
    created_at: timestamp,
  },
  {
    id: 'alias-beer',
    canonical_name: 'ビール',
    alias_name: 'beer',
    created_at: timestamp,
  },
  {
    id: 'alias-soda',
    canonical_name: 'ソーダ',
    alias_name: '炭酸水',
    created_at: timestamp,
  },
  {
    id: 'alias-cola',
    canonical_name: 'コーラ',
    alias_name: 'cola',
    created_at: timestamp,
  },
  {
    id: 'alias-ginger',
    canonical_name: 'ジンジャーエール',
    alias_name: 'ginger ale',
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

function makeRecipe(id: string, name: string): CocktailRecipe {
  return {
    ...recipe,
    id,
    name,
    description: `${name}のテスト用レシピ。`,
    garnish: null,
  };
}

function makeIngredient({
  id,
  recipeId,
  name,
  type,
}: {
  id: string;
  recipeId: string;
  name: string;
  type: string;
}): CocktailIngredient {
  return {
    id,
    recipe_id: recipeId,
    ingredient_name: name,
    ingredient_type: type,
    amount: 45,
    unit: 'ml',
    is_required: true,
    substitute_group: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function makeInventoryItem({
  id,
  name,
  itemType,
  category = null,
}: {
  id: string;
  name: string;
  itemType: InventoryItem['item_type'];
  category?: string | null;
}): InventoryItem {
  return {
    ...baseItem,
    id,
    name,
    item_type: itemType,
    category,
    sub_category: null,
    alcohol_percentage: itemType === 'alcohol' ? 25 : null,
    volume_ml: 700,
    remaining_ml: 700,
  };
}

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

  it('returns makeable for shochu soda through aliases', () => {
    const shochuSoda = makeRecipe('recipe-shochu-soda', '焼酎ソーダ割り');
    const results = matchRecipes({
      inventoryItems: [
        makeInventoryItem({
          id: 'item-shochu',
          name: '三岳',
          itemType: 'alcohol',
        }),
        makeInventoryItem({
          id: 'item-soda',
          name: '炭酸水',
          itemType: 'drink',
        }),
      ],
      cocktailRecipes: [shochuSoda],
      cocktailIngredients: [
        makeIngredient({
          id: 'ingredient-shochu',
          recipeId: shochuSoda.id,
          name: '焼酎',
          type: 'alcohol',
        }),
        makeIngredient({
          id: 'ingredient-soda',
          recipeId: shochuSoda.id,
          name: 'ソーダ',
          type: 'drink',
        }),
      ],
      ingredientAliases: [
        ...aliases,
        {
          id: 'alias-shochu',
          canonical_name: '焼酎',
          alias_name: '三岳',
          created_at: timestamp,
        },
        {
          id: 'alias-soda',
          canonical_name: 'ソーダ',
          alias_name: '炭酸水',
          created_at: timestamp,
        },
      ],
    });

    expect(results[0]?.status).toBe('makeable');
  });

  it('returns makeable for kahlua milk through aliases', () => {
    const kahluaMilk = makeRecipe('recipe-kahlua-milk', 'カルーアミルク');
    const results = matchRecipes({
      inventoryItems: [
        makeInventoryItem({
          id: 'item-kahlua',
          name: 'KAHLUA',
          itemType: 'alcohol',
        }),
        makeInventoryItem({
          id: 'item-milk',
          name: '牛乳',
          itemType: 'drink',
        }),
      ],
      cocktailRecipes: [kahluaMilk],
      cocktailIngredients: [
        makeIngredient({
          id: 'ingredient-kahlua',
          recipeId: kahluaMilk.id,
          name: 'コーヒーリキュール',
          type: 'alcohol',
        }),
        makeIngredient({
          id: 'ingredient-milk',
          recipeId: kahluaMilk.id,
          name: '牛乳',
          type: 'drink',
        }),
      ],
      ingredientAliases: [
        ...aliases,
        {
          id: 'alias-kahlua',
          canonical_name: 'コーヒーリキュール',
          alias_name: 'KAHLUA',
          created_at: timestamp,
        },
      ],
    });

    expect(results[0]?.status).toBe('makeable');
  });

  it('returns makeable for shandy gaff with beer and ginger ale', () => {
    const shandyGaff = makeRecipe('recipe-shandy-gaff', 'シャンディガフ');
    const results = matchRecipes({
      inventoryItems: [
        makeInventoryItem({
          id: 'item-beer',
          name: 'beer',
          itemType: 'alcohol',
        }),
        makeInventoryItem({
          id: 'item-ginger',
          name: 'ginger ale',
          itemType: 'drink',
        }),
      ],
      cocktailRecipes: [shandyGaff],
      cocktailIngredients: [
        makeIngredient({
          id: 'ingredient-beer',
          recipeId: shandyGaff.id,
          name: 'ビール',
          type: 'alcohol',
        }),
        makeIngredient({
          id: 'ingredient-ginger',
          recipeId: shandyGaff.id,
          name: 'ジンジャーエール',
          type: 'drink',
        }),
      ],
      ingredientAliases: [
        ...aliases,
        {
          id: 'alias-beer',
          canonical_name: 'ビール',
          alias_name: 'beer',
          created_at: timestamp,
        },
        {
          id: 'alias-ginger',
          canonical_name: 'ジンジャーエール',
          alias_name: 'ginger ale',
          created_at: timestamp,
        },
      ],
    });

    expect(results[0]?.status).toBe('makeable');
  });

  it('connects AI-normalized home-bar inventory names to expected makeable recipes', () => {
    const cases: {
      recipeName: string;
      requiredIngredients: [string, string];
      inventoryItems: {
        id: string;
        name: string;
        itemType: InventoryItem['item_type'];
      }[];
    }[] = [
      {
        recipeName: 'ジンソーダ',
        requiredIngredients: ['ジン', 'ソーダ'],
        inventoryItems: [
          { id: 'case-sui', name: 'SUNTORY GIN SUI', itemType: 'alcohol' },
          { id: 'case-soda-1', name: '炭酸水', itemType: 'drink' },
        ],
      },
      {
        recipeName: 'カルーアミルク',
        requiredIngredients: ['コーヒーリキュール', '牛乳'],
        inventoryItems: [
          { id: 'case-kahlua', name: 'Kahlúa', itemType: 'alcohol' },
          { id: 'case-milk', name: '牛乳', itemType: 'drink' },
        ],
      },
      {
        recipeName: '焼酎オレンジ',
        requiredIngredients: ['焼酎', 'オレンジジュース'],
        inventoryItems: [
          { id: 'case-mitake', name: '三岳', itemType: 'alcohol' },
          {
            id: 'case-orange',
            name: 'オレンジジュース',
            itemType: 'drink',
          },
        ],
      },
      {
        recipeName: '日本酒ソーダ',
        requiredIngredients: ['日本酒', 'ソーダ'],
        inventoryItems: [
          { id: 'case-urakasumi', name: '浦霞', itemType: 'alcohol' },
          { id: 'case-soda-2', name: '炭酸水', itemType: 'drink' },
        ],
      },
      {
        recipeName: 'ウイスキーコーク',
        requiredIngredients: ['ウイスキー', 'コーラ'],
        inventoryItems: [
          { id: 'case-kakubin', name: '角瓶', itemType: 'alcohol' },
          { id: 'case-cola', name: 'cola', itemType: 'drink' },
        ],
      },
      {
        recipeName: 'ハイボール',
        requiredIngredients: ['ウイスキー', 'ソーダ'],
        inventoryItems: [
          { id: 'case-kakubin-highball', name: '角瓶', itemType: 'alcohol' },
          { id: 'case-soda-3', name: '炭酸水', itemType: 'drink' },
        ],
      },
      {
        recipeName: 'シャンディガフ',
        requiredIngredients: ['ビール', 'ジンジャーエール'],
        inventoryItems: [
          { id: 'case-beer', name: 'beer', itemType: 'alcohol' },
          { id: 'case-ginger', name: 'ginger ale', itemType: 'drink' },
        ],
      },
    ];

    cases.forEach((testCase, index) => {
      const targetRecipe = makeRecipe(`recipe-home-bar-${index}`, testCase.recipeName);
      const results = matchRecipes({
        inventoryItems: testCase.inventoryItems.map((item) =>
          makeInventoryItem(item),
        ),
        cocktailRecipes: [targetRecipe],
        cocktailIngredients: testCase.requiredIngredients.map(
          (ingredientName, ingredientIndex) =>
            makeIngredient({
              id: `ingredient-home-bar-${index}-${ingredientIndex}`,
              recipeId: targetRecipe.id,
              name: ingredientName,
              type: ingredientIndex === 0 ? 'alcohol' : 'drink',
            }),
        ),
        ingredientAliases: homeBarAliases,
      });

      expect(results[0], testCase.recipeName).toMatchObject({
        recipeId: targetRecipe.id,
        status: 'makeable',
        missingIngredients: [],
      });
    });
  });
});
