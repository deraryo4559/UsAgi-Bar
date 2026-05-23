import type { InventoryItem } from '../../types/inventory';

const itemTypeLabels: Record<InventoryItem['item_type'], string> = {
  alcohol: 'お酒',
  drink: 'ドリンク',
  mixer: '割材',
  other: 'その他',
};

function formatNumber(value: number | null, unit: string) {
  return value === null ? '-' : `${value}${unit}`;
}

function remainingPercent(item: InventoryItem) {
  if (!item.volume_ml || item.remaining_ml === null) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round((item.remaining_ml / item.volume_ml) * 100)),
  );
}

type InventorySummaryProps = {
  item: InventoryItem;
};

export function InventorySummary({ item }: InventorySummaryProps) {
  const percent = remainingPercent(item);

  return (
    <section className="grid gap-5 rounded border border-stone-200 bg-white p-4 sm:grid-cols-[220px_1fr]">
      <div className="flex min-h-56 items-center justify-center rounded bg-stone-100">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="max-h-56 object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-stone-500">
            <div className="h-36 w-16 rounded-t-lg border border-stone-500 bg-gradient-to-b from-stone-100 to-stone-300" />
            <span className="text-xs">画像なし</span>
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-stone-500">{itemTypeLabels[item.item_type]}</p>
          <h2 className="mt-1 text-2xl font-bold">{item.name}</h2>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-stone-500">カテゴリ</dt>
            <dd className="font-medium">{item.category ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-stone-500">サブカテゴリ</dt>
            <dd className="font-medium">{item.sub_category ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-stone-500">度数</dt>
            <dd className="font-medium">
              {formatNumber(item.alcohol_percentage, '%')}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">容量 / 残量</dt>
            <dd className="font-medium">
              {formatNumber(item.volume_ml, 'ml')} /{' '}
              {formatNumber(item.remaining_ml, 'ml')}
            </dd>
          </div>
        </dl>
        <div>
          <div className="mb-1 flex justify-between text-xs text-stone-500">
            <span>残量</span>
            <span>{percent}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        {item.memo ? <p className="text-sm text-stone-600">{item.memo}</p> : null}
      </div>
    </section>
  );
}
