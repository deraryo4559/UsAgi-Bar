import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { InventorySummary } from '../features/inventory/InventorySummary';
import { RecipeMatchList } from '../features/recipes/RecipeMatchList';
import {
  getInventoryItemById,
  listInventoryItems,
} from '../features/inventory/api/inventoryItems';
import { fetchRecipeCatalog } from '../features/recipes/api/recipeCatalog';
import {
  getRecipeIdsUsingItem,
  prioritizeRecipesUsingItem,
  splitRecipeMatchesByStatus,
} from '../features/recipes/recipeDisplay';
import { matchRecipes } from '../lib/recipes/matchRecipes';
import { toErrorMessage } from '../lib/supabase/errors';
import type { InventoryItem } from '../types/inventory';
import type {
  CocktailIngredient,
  CocktailRecipe,
  IngredientAlias,
  RecipeMatchResult,
} from '../types/recipes';

type DetailData = {
  item: InventoryItem | null;
  inventoryItems: InventoryItem[];
  cocktailRecipes: CocktailRecipe[];
  cocktailIngredients: CocktailIngredient[];
  ingredientAliases: IngredientAlias[];
};

export function ItemDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<DetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const itemId = id;
    let isMounted = true;

    async function loadDetail() {
      setIsLoading(true);
      setError(null);

      try {
        const [item, inventoryItems, recipeCatalog] = await Promise.all([
          getInventoryItemById(itemId),
          listInventoryItems(),
          fetchRecipeCatalog(),
        ]);

        if (isMounted) {
          setData({
            item,
            inventoryItems,
            ...recipeCatalog,
          });
        }
      } catch (nextError) {
        if (isMounted) {
          setError(toErrorMessage(nextError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const matches = useMemo<RecipeMatchResult[]>(() => {
    if (!data) {
      return [];
    }

    return matchRecipes({
      inventoryItems: data.inventoryItems,
      cocktailRecipes: data.cocktailRecipes,
      cocktailIngredients: data.cocktailIngredients,
      ingredientAliases: data.ingredientAliases,
      nearThreshold: 1,
    });
  }, [data]);

  const visibleRecipes = useMemo(() => {
    if (!data?.item) {
      return [];
    }

    return prioritizeRecipesUsingItem(
      data.cocktailRecipes,
      matches,
      data.item,
      data.cocktailIngredients,
      data.ingredientAliases,
    );
  }, [data, matches]);

  const recipeSections = useMemo(
    () => splitRecipeMatchesByStatus(visibleRecipes),
    [visibleRecipes],
  );

  const targetItemHasRecipes = useMemo(() => {
    if (!data?.item) {
      return false;
    }

    return (
      getRecipeIdsUsingItem(
        data.item,
        data.cocktailIngredients,
        data.ingredientAliases,
      ).size > 0
    );
  }, [data]);

  const hasAvailableInventory = useMemo(() => {
    if (!data) {
      return false;
    }

    return data.inventoryItems.some(
      (item) => item.remaining_ml === null || item.remaining_ml > 0,
    );
  }, [data]);

  if (isLoading) {
    return (
      <AppShell title="アイテム詳細">
        <div className="rounded border border-stone-200 bg-white p-5 text-sm text-stone-600">
          アイテム詳細を読み込んでいます。
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="アイテム詳細">
        <div className="rounded border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          {error}
        </div>
      </AppShell>
    );
  }

  if (!data?.item) {
    return (
      <AppShell title="アイテム詳細">
        <div className="rounded border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-600">アイテムが見つかりません。</p>
          <Link
            to="/"
            className="mt-4 inline-flex rounded border border-stone-300 px-3 py-2 text-sm font-medium"
          >
            酒棚へ戻る
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="アイテム詳細">
      <InventorySummary item={data.item} />
      <section>
        <h2 className="mb-3 text-lg font-bold">
          このアイテムを使う・今作れるカクテル
        </h2>
        <RecipeMatchList
          makeableRecipes={recipeSections.makeable}
          nearRecipes={recipeSections.near}
          hasRecipeCatalog={data.cocktailRecipes.length > 0}
          hasAvailableInventory={hasAvailableInventory}
          targetItemHasRecipes={targetItemHasRecipes}
        />
      </section>
    </AppShell>
  );
}
