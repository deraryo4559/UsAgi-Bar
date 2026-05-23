import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { BottlePlaceholder } from '../../components/ui/BottlePlaceholder';
import { RemainingMeter } from '../../components/ui/RemainingMeter';
import type { InventoryItem } from '../../types/inventory';

const itemTypeLabels: Record<InventoryItem['item_type'], string> = {
  alcohol: 'お酒',
  drink: 'ドリンク',
  mixer: '割材',
  other: 'その他',
};

const itemTypeTones: Record<
  InventoryItem['item_type'],
  'accent' | 'info' | 'pink' | 'mint'
> = {
  alcohol: 'accent',
  drink: 'info',
  mixer: 'pink',
  other: 'mint',
};

function formatNumber(value: number | null, unit: string) {
  return value === null ? '—' : `${value}${unit}`;
}

type InventorySummaryProps = {
  item: InventoryItem;
};

export function InventorySummary({ item }: InventorySummaryProps) {
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-5 sm:grid-cols-[240px_1fr]">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-cream-50 ring-1 ring-cream-200">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full max-w-[60%] flex-col items-center justify-end pb-3">
              <BottlePlaceholder itemType={item.item_type} />
              <span className="mt-2 text-[11px] text-usagi-ink/50">画像なし</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={itemTypeTones[item.item_type]} size="sm">
                {itemTypeLabels[item.item_type]}
              </Badge>
              {item.category ? (
                <Badge tone="neutral" size="sm">
                  {item.category}
                </Badge>
              ) : null}
              {item.sub_category ? (
                <Badge tone="neutral" size="sm">
                  {item.sub_category}
                </Badge>
              ) : null}
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
              {item.name}
            </h2>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-usagi-ink/60">度数</dt>
              <dd className="font-semibold">
                {formatNumber(item.alcohol_percentage, '%')}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-usagi-ink/60">容量</dt>
              <dd className="font-semibold">
                {formatNumber(item.volume_ml, 'ml')}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <RemainingMeter
                volumeMl={item.volume_ml}
                remainingMl={item.remaining_ml}
              />
            </div>
          </dl>

          {item.memo ? (
            <p className="rounded-xl bg-cream-50 px-3 py-2 text-sm text-usagi-ink/80 ring-1 ring-cream-200">
              {item.memo}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
