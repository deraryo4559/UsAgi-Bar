import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  formatIngredientAmount,
  type RecipeDisplayItem,
} from './recipeDisplay';

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

function RecipeCard({
  item,
  tone,
}: {
  item: RecipeDisplayItem;
  tone: 'makeable' | 'near';
}) {
  const { recipe, match, ingredients, usesTargetItem } = item;
  const isNear = tone === 'near';

  return (
    <article
      className={`rounded-2xl border ${
        isNear
          ? 'border-usagi-pink bg-usagi-pinkSoft/50'
          : 'border-usagi-mint bg-usagi-mintSoft/60'
      } p-4 shadow-soft`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-usagi-ink">{recipe.name}</h3>
          {usesTargetItem ? (
            <p className="mt-0.5 text-[11px] font-medium text-usagi-ink/60">
              このアイテムを使うレシピ
            </p>
          ) : null}
        </div>
        <Badge tone={isNear ? 'near' : 'makeable'} size="sm">
          {isNear ? 'あと1つで作れる' : '作れる'}
        </Badge>
      </div>

      {recipe.description ? (
        <p className="mt-2 text-sm text-usagi-ink/80">{recipe.description}</p>
      ) : null}

      {isNear && match.missingIngredients.length ? (
        <div className="mt-3 rounded-xl border border-usagi-pink/60 bg-white/70 px-3 py-2 text-sm text-rose-900">
          <span className="mr-1 text-xs font-bold text-rose-700">不足:</span>
          {match.missingIngredients.map((ingredient) => (
            <Badge
              key={ingredient}
              tone="pink"
              size="sm"
              className="ml-1 align-middle"
            >
              {ingredient}
            </Badge>
          ))}
        </div>
      ) : null}

      {ingredients.length ? (
        <div className="mt-4">
          <h4 className="text-xs font-bold text-usagi-ink/70">材料</h4>
          <ul className="mt-1 grid gap-1 text-sm text-usagi-ink/80">
            {ingredients.map((ingredient) => {
              const amount = formatIngredientAmount(ingredient);

              return (
                <li
                  key={ingredient.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/60 pb-1 last:border-b-0"
                >
                  <span>
                    {ingredient.ingredient_name}
                    {!ingredient.is_required ? (
                      <span className="ml-2 text-[10px] text-usagi-ink/40">
                        任意
                      </span>
                    ) : null}
                  </span>
                  {amount ? (
                    <span className="text-xs font-medium text-usagi-ink/60">
                      {amount}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <dl className="mt-3 grid gap-2 text-xs text-usagi-ink/70 sm:grid-cols-3">
        {recipe.method ? (
          <div>
            <dt className="font-bold text-usagi-ink/60">作り方</dt>
            <dd>{getMethodLabel(recipe.method)}</dd>
          </div>
        ) : null}
        {recipe.glass_type ? (
          <div>
            <dt className="font-bold text-usagi-ink/60">グラス</dt>
            <dd>{recipe.glass_type}</dd>
          </div>
        ) : null}
        {recipe.garnish ? (
          <div>
            <dt className="font-bold text-usagi-ink/60">ガーニッシュ</dt>
            <dd>{recipe.garnish}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function RecipeSection({
  title,
  emoji,
  items,
  tone,
  emptyMessage,
}: {
  title: string;
  emoji: string;
  items: RecipeDisplayItem[];
  tone: 'makeable' | 'near';
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <section className="grid gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-usagi-ink">
          <span aria-hidden="true">{emoji}</span>
          {title}
        </h3>
        <Card tone="cream" padded={true}>
          <p className="text-sm text-usagi-ink/70">{emptyMessage}</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="grid gap-3">
      <h3 className="flex items-center gap-2 text-sm font-bold text-usagi-ink">
        <span aria-hidden="true">{emoji}</span>
        {title}
        <span className="text-xs font-normal text-usagi-ink/50">
          ({items.length}件)
        </span>
      </h3>
      <div className="grid gap-3">
        {items.map((item) => (
          <RecipeCard key={item.recipe.id} item={item} tone={tone} />
        ))}
      </div>
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

  if (!hasRecipeCatalog) {
    return (
      <EmptyState
        title="カクテルDBがまだ空です"
        mascotMessage="レシピが揃ったら、ここで作れるカクテルを案内するぞ。"
      >
        管理者がレシピを追加すると、ここに作れるカクテルが表示されます。
      </EmptyState>
    );
  }

  if (!hasAvailableInventory) {
    return (
      <EmptyState
        title="在庫がまだありません"
        mascotMessage="まずは1本、棚に置いてみるか。"
      >
        在庫を追加すると、いま作れるカクテルが見えてきます。
      </EmptyState>
    );
  }

  if (!hasVisibleRecipes && !targetItemHasRecipes) {
    return (
      <EmptyState
        title="このアイテムを使うレシピはまだ登録されていません"
        mascotMessage="このアイテム単体でストレートもアリだ。"
      />
    );
  }

  return (
    <div className="grid gap-5">
      <RecipeSection
        title="作れるカクテル"
        emoji="🥃"
        items={makeableRecipes}
        tone="makeable"
        emptyMessage="今ある在庫で作れるカクテルはまだありません。"
      />
      <RecipeSection
        title="あと1つで作れるカクテル"
        emoji="✨"
        items={nearRecipes}
        tone="near"
        emptyMessage="あと一歩のレシピはありません。"
      />
    </div>
  );
}
