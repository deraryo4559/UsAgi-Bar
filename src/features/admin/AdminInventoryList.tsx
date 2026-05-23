import type { InventoryItem } from '../../types/inventory';

type AdminInventoryListProps = {
  items: InventoryItem[];
};

export function AdminInventoryList({ items }: AdminInventoryListProps) {
  return (
    <div className="overflow-hidden rounded border border-stone-200 bg-white">
      <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-600 sm:grid-cols-[1fr_120px_120px_auto]">
        <span>名前</span>
        <span className="hidden sm:block">種別</span>
        <span className="hidden sm:block">残量</span>
        <span>操作</span>
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-stone-100 px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[1fr_120px_120px_auto]"
        >
          <span className="font-medium">{item.name}</span>
          <span className="hidden text-stone-600 sm:block">{item.item_type}</span>
          <span className="hidden text-stone-600 sm:block">
            {item.remaining_ml ?? '-'}ml
          </span>
          <div className="flex gap-2">
            <button className="rounded border border-stone-300 px-2 py-1 text-xs">
              編集
            </button>
            <button className="rounded border border-stone-300 px-2 py-1 text-xs">
              残量
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
