import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { RemainingMeter } from '../../components/ui/RemainingMeter';
import type { InventoryItem } from '../../types/inventory';
import { calculateRemainingMl } from '../inventory/api/inventoryItems';

const presetOptions = [
  { label: '100%', ratio: 1 },
  { label: '75%', ratio: 0.75 },
  { label: '50%', ratio: 0.5 },
  { label: '25%', ratio: 0.25 },
  { label: '空', ratio: 0 },
];

const itemTypeTones: Record<
  InventoryItem['item_type'],
  'accent' | 'info' | 'pink' | 'mint'
> = {
  alcohol: 'accent',
  drink: 'info',
  mixer: 'pink',
  other: 'mint',
};

type AdminInventoryTableProps = {
  items: InventoryItem[];
  busyItemId: string | null;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onUpdateRemaining: (item: InventoryItem, remainingMl: number) => void;
};

export function AdminInventoryTable({
  items,
  busyItemId,
  onEdit,
  onDelete,
  onUpdateRemaining,
}: AdminInventoryTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="まだ在庫アイテムがありません"
        mascotMessage="上のフォームから1本登録してみるか。"
      />
    );
  }

  return (
    <Card padded={false} className="overflow-hidden">
      <ul className="divide-y divide-cream-100">
        {items.map((item) => {
          const isBusy = busyItemId === item.id;

          return (
            <li
              key={item.id}
              className="grid gap-3 p-4 sm:grid-cols-[64px_1fr_auto] sm:items-center"
            >
              <div className="hidden h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-cream-50 ring-1 ring-cream-200 sm:flex">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt=""
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <span className="text-[10px] text-usagi-ink/40">no img</span>
                )}
              </div>

              <div className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-usagi-ink">{item.name}</span>
                  <Badge tone={itemTypeTones[item.item_type]} size="sm">
                    {item.item_type}
                  </Badge>
                  {item.category ? (
                    <Badge tone="neutral" size="sm">
                      {item.category}
                    </Badge>
                  ) : null}
                </div>
                <div className="max-w-md">
                  <RemainingMeter
                    volumeMl={item.volume_ml}
                    remainingMl={item.remaining_ml}
                    size="sm"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {presetOptions.map((option) => {
                    const nextRemainingMl = calculateRemainingMl(
                      item.volume_ml,
                      option.ratio,
                    );

                    return (
                      <button
                        key={option.label}
                        className="rounded-full border border-cream-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-usagi-ink/70 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={isBusy || nextRemainingMl === null}
                        type="button"
                        onClick={() => {
                          if (nextRemainingMl !== null) {
                            onUpdateRemaining(item, nextRemainingMl);
                          }
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onEdit(item)}
                >
                  編集
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onDelete(item)}
                >
                  削除
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
