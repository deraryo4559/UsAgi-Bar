import { Button } from '../../components/ui/Button';
import type { InventoryItem } from '../../types/inventory';
import { calculateRemainingMl } from '../inventory/api/inventoryItems';

const presetOptions = [
  { label: '100%', ratio: 1 },
  { label: '75%', ratio: 0.75 },
  { label: '50%', ratio: 0.5 },
  { label: '25%', ratio: 0.25 },
  { label: '空', ratio: 0 },
];

type AdminInventoryTableProps = {
  items: InventoryItem[];
  busyItemId: string | null;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onUpdateRemaining: (item: InventoryItem, remainingMl: number) => void;
};

function remainingLabel(item: InventoryItem) {
  if (item.remaining_ml === null) {
    return '-';
  }

  if (!item.volume_ml) {
    return `${item.remaining_ml}ml`;
  }

  const percent = Math.round((item.remaining_ml / item.volume_ml) * 100);
  return `${item.remaining_ml}ml (${percent}%)`;
}

export function AdminInventoryTable({
  items,
  busyItemId,
  onEdit,
  onDelete,
  onUpdateRemaining,
}: AdminInventoryTableProps) {
  if (items.length === 0) {
    return (
      <p className="rounded border border-stone-200 bg-white p-4 text-sm text-stone-600">
        まだ在庫アイテムがありません。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-stone-200 bg-white">
      <table className="min-w-[920px] w-full text-left text-sm">
        <thead className="bg-stone-50 text-xs font-semibold text-stone-600">
          <tr>
            <th className="px-3 py-3">名前</th>
            <th className="px-3 py-3">種別</th>
            <th className="px-3 py-3">カテゴリ</th>
            <th className="px-3 py-3">残量</th>
            <th className="px-3 py-3">プリセット</th>
            <th className="px-3 py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isBusy = busyItemId === item.id;

            return (
              <tr key={item.id} className="border-t border-stone-100">
                <td className="px-3 py-3 font-medium">{item.name}</td>
                <td className="px-3 py-3 text-stone-600">{item.item_type}</td>
                <td className="px-3 py-3 text-stone-600">
                  {item.category ?? '-'}
                </td>
                <td className="px-3 py-3 text-stone-600">
                  {remainingLabel(item)}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {presetOptions.map((option) => {
                      const nextRemainingMl = calculateRemainingMl(
                        item.volume_ml,
                        option.ratio,
                      );

                      return (
                        <button
                          key={option.label}
                          className="rounded border border-stone-300 px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
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
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-3 py-1"
                      disabled={isBusy}
                      onClick={() => onEdit(item)}
                    >
                      編集
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="px-3 py-1"
                      disabled={isBusy}
                      onClick={() => onDelete(item)}
                    >
                      削除
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
