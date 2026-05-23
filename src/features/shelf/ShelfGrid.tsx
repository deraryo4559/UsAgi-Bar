import { Link } from 'react-router-dom';
import type { InventoryItem } from '../../types/inventory';

const typeLabels: Record<InventoryItem['item_type'], string> = {
  alcohol: 'お酒',
  drink: 'ドリンク',
  mixer: '割材',
  other: 'その他',
};

const bottleClasses: Record<InventoryItem['item_type'], string> = {
  alcohol: 'from-amber-200 via-stone-100 to-stone-400 border-stone-600',
  drink: 'from-sky-100 via-cyan-100 to-sky-400 border-sky-700',
  mixer: 'from-rose-100 via-white to-rose-300 border-rose-700',
  other: 'from-emerald-100 via-white to-emerald-300 border-emerald-700',
};

function chunkItems(items: InventoryItem[], size: number) {
  const rows: InventoryItem[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  while (rows.length < 3) {
    rows.push([]);
  }

  return rows;
}

function remainingPercent(item: InventoryItem) {
  if (!item.volume_ml || item.remaining_ml === null) {
    return null;
  }

  return Math.max(
    0,
    Math.min(100, Math.round((item.remaining_ml / item.volume_ml) * 100)),
  );
}

type ShelfGridProps = {
  items: InventoryItem[];
};

export function ShelfGrid({ items }: ShelfGridProps) {
  const sortedItems = [...items].sort(
    (a, b) => {
      const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    },
  );
  const rows = chunkItems(sortedItems, 5);

  return (
    <section
      aria-label="酒棚"
      className="mx-auto w-full max-w-5xl rounded border border-stone-800 bg-stone-700 p-3 shadow-sm"
    >
      <div className="space-y-3">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-3 gap-3 border-b-[12px] border-stone-900 bg-gradient-to-b from-stone-200 to-stone-300 px-3 pt-5 sm:grid-cols-5"
          >
            {row.map((item) => {
              const percent = remainingPercent(item);

              return (
                <Link
                  key={item.id}
                  to={`/item/${item.id}`}
                  className="group flex min-h-48 flex-col items-center justify-end gap-2 outline-none"
                >
                  <div className="relative flex h-32 w-14 flex-col items-center justify-end sm:h-40 sm:w-16">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <>
                        <div className="h-7 w-6 rounded-t border border-b-0 border-stone-700 bg-stone-200" />
                        <div
                          className={`h-28 w-14 rounded-t-lg border bg-gradient-to-b shadow-sm transition group-hover:-translate-y-1 sm:h-36 sm:w-16 ${bottleClasses[item.item_type]}`}
                        >
                          <div className="mx-auto mt-8 h-10 w-10 rounded border border-white/70 bg-white/60" />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mb-2 w-full rounded bg-white/85 px-2 py-1 text-center shadow-sm">
                    <div className="truncate text-xs font-semibold text-stone-900">
                      {item.name}
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-stone-600">
                      <span>{item.category ?? typeLabels[item.item_type]}</span>
                      {percent !== null ? <span>{percent}%</span> : null}
                    </div>
                  </div>
                </Link>
              );
            })}
            {row.length === 0 ? (
              <div className="col-span-full flex min-h-48 items-center justify-center text-xs font-medium text-stone-500">
                棚はまだ空です
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
