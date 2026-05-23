import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { MascotBubble } from '../components/ui/MascotBubble';
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

function pickMascotMessage(
  makeableCount: number,
  nearCount: number,
): string | null {
  if (makeableCount > 0) {
    return '今夜はこれで一杯いけるぞ。';
  }
  if (nearCount > 0) {
    return 'あと1つで作れるやつがあるぞ。';
  }
  return null;
}

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
      <AppShell title="アイテム詳細" backTo="/">
        <LoadingState label="アイテムを取り出しています…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="アイテム詳細" backTo="/">
        <ErrorState
          message={error}
          mascotMessage="うまく取り出せなかった。もう一度試してくれ。"
        />
      </AppShell>
    );
  }

  if (!data?.item) {
    return (
      <AppShell title="アイテム詳細" backTo="/">
        <Card>
          <p className="text-sm text-usagi-ink/80">
            アイテムが見つかりません。
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex rounded-full border border-cream-300 bg-white px-4 py-2 text-sm font-semibold text-usagi-ink hover:bg-cream-50"
          >
            ← 酒棚へ戻る
          </Link>
        </Card>
      </AppShell>
    );
  }

  const mascotMessage = pickMascotMessage(
    recipeSections.makeable.length,
    recipeSections.near.length,
  );

  return (
    <AppShell title={data.item.name} backTo="/">
      <InventorySummary item={data.item} />

      {mascotMessage ? (
        <MascotBubble size="md" variant="card">
          {mascotMessage}
        </MascotBubble>
      ) : null}

      <section className="grid gap-3">
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
