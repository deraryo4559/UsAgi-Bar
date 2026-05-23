import type { RecipeMatchStatus } from '../../types/recipes';
import {
  formatIngredientAmount,
  formatMissingIngredients,
  type RecipeDisplayItem,
} from './recipeDisplay';

const statusLabels: Record<RecipeMatchStatus, string> = {
  makeable: '作れる',
  near: 'あと1つで作れる',
  not_makeable: '不足あり',
};

const statusClasses: Record<RecipeMatchStatus, string> = {
  makeable: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  near: 'border-amber-200 bg-amber-50 text-amber-800',
  not_makeable: 'border-stone-200 bg-stone-100 text-stone-600',
};

const methodLabels: Record<string, string> = {
  build: 'ビルド',
  shake: 'シェイク',
  stir: 'ステア',
  blend: 'ブレンド',
};

type RecipeMatchListProps = {
  makeableRecipes: RecipeDisplayItem[];
  nearRecipes: RecipeDisplayItem[];
  hasRecipeCatalog: boolean;
  hasAvailableInventory: boolean;
  targetItemHasRecipes: boolean;
};

function getMethodLabel(method: string) {
  return methodLabels[method.toLowerCase()] ?? method;
}

function EmptyMessage({
  hasRecipeCatalog,
  hasAvailableInventory,
}: {
  hasRecipeCatalog: boolean;
  hasAvailableInventory: boolean;
}) {
  if (!hasRecipeCatalog) {
    return (
      <p className="rounded border border-stone-200 bg-white p-4 text-sm text-stone-600">
        カクテルDBがまだ空です。レシピを追加すると、作れるカクテルが表示されます。
      </p>
    );
  }

  if (!hasAvailableInventory) {
    return (
      <p className="rounded border border-stone-200 bg-white p-4 text-sm text-stone-600">
        在庫を追加すると、作れるカクテルが表示されます。
      </p>
    );
  }

  return (
    <p className="rounded border border-stone-200 bg-white p-4 text-sm text-stone-600">
      このアイテムを使って作れるカクテルはまだありません。
    </p>
  );
}

function RecipeCard({ item }: { item: RecipeDisplayItem }) {
  const { recipe, match, ingredients, usesTargetItem } = item;

  return (
    <article className="rounded border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold">{recipe.name}</h3>
          {usesTargetItem ? (
            <p className="mt-1 text-xs font-medium text-stone-500">
              このアイテムを使うレシピ
            </p>
          ) : null}
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClasses[match.status]}`}
        >
          {statusLabels[match.status]}
        </span>
      </div>

      {recipe.description ? (
        <p className="mt-3 text-sm text-stone-600">{recipe.description}</p>
      ) : null}

      {match.status === 'near' && match.missingIngredients.length ? (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {formatMissingIngredients(match.missingIngredients)}
        </p>
      ) : null}

      {ingredients.length ? (
        <div className="mt-4">
          <h4 className="text-sm font-semibold">材料</h4>
          <ul className="mt-2 grid gap-1 text-sm text-stone-600">
            {ingredients.map((ingredient) => {
              const amount = formatIngredientAmount(ingredient);

              return (
                <li
                  key={ingredient.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-100 pb-1 last:border-b-0"
                >
                  <span>
                    {ingredient.ingredient_name}
                    {!ingredient.is_required ? (
                      <span className="ml-2 text-xs text-stone-400">任意</span>
                    ) : null}
                  </span>
                  {amount ? (
                    <span className="text-xs font-medium text-stone-500">
                      {amount}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <dl className="mt-4 grid gap-2 text-sm text-stone-600 sm:grid-cols-3">
        {recipe.method ? (
          <div>
            <dt className="text-xs font-semibold text-stone-500">作り方</dt>
            <dd>{getMethodLabel(recipe.method)}</dd>
          </div>
        ) : null}
        {recipe.glass_type ? (
          <div>
            <dt className="text-xs font-semibold text-stone-500">グラス</dt>
            <dd>{recipe.glass_type}</dd>
          </div>
        ) : null}
        {recipe.garnish ? (
          <div>
            <dt className="text-xs font-semibold text-stone-500">
              ガーニッシュ
            </dt>
            <dd>{recipe.garnish}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function RecipeSection({
  title,
  items,
}: {
  title: string;
  items: RecipeDisplayItem[];
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-bold">{title}</h3>
      {items.length ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <RecipeCard key={item.recipe.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="rounded border border-stone-200 bg-white p-4 text-sm text-stone-600">
          該当するカクテルはまだありません。
        </p>
      )}
    </section>
  );
}

export function RecipeMatchList({
  makeableRecipes,
  nearRecipes,
  hasRecipeCatalog,
  hasAvailableInventory,
  targetItemHasRecipes,
}: RecipeMatchListProps) {
  const hasVisibleRecipes =
    makeableRecipes.length > 0 || nearRecipes.length > 0;

  return (
    <div className="grid gap-5">
      {!targetItemHasRecipes && hasRecipeCatalog ? (
        <p className="rounded border border-stone-200 bg-white p-4 text-sm text-stone-600">
          このアイテムを使うレシピはまだ登録されていません。
        </p>
      ) : null}

      {!hasVisibleRecipes ? (
        <EmptyMessage
          hasRecipeCatalog={hasRecipeCatalog}
          hasAvailableInventory={hasAvailableInventory}
        />
      ) : null}

      {hasVisibleRecipes ? (
        <>
          <RecipeSection title="作れるカクテル" items={makeableRecipes} />
          <RecipeSection title="あと1つで作れるカクテル" items={nearRecipes} />
        </>
      ) : null}
    </div>
  );
}
