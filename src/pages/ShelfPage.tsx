import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShelfGrid } from '../features/shelf/ShelfGrid';
import {
  listInventoryItems,
  sortInventoryItems,
} from '../features/inventory/api/inventoryItems';
import { toErrorMessage } from '../lib/supabase/errors';
import type { InventoryItem } from '../types/inventory';

export function ShelfPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      setIsLoading(true);
      setError(null);

      try {
        const nextItems = await listInventoryItems();

        if (isMounted) {
          setItems(sortInventoryItems(nextItems));
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

    void loadItems();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 text-stone-900 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl justify-end pb-3">
        <Link
          to="/admin/login"
          className="rounded-full border border-stone-300 bg-white/90 px-3 py-1 text-xs font-medium text-stone-700 shadow-sm hover:bg-white"
        >
          管理
        </Link>
      </div>
      {isLoading ? (
        <div className="mx-auto max-w-5xl rounded border border-stone-200 bg-white p-5 text-sm text-stone-600">
          酒棚を読み込んでいます。
        </div>
      ) : null}
      {error ? (
        <div className="mx-auto max-w-5xl rounded border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {!isLoading && !error ? (
        <>
          {items.length === 0 ? (
            <div className="mx-auto mb-3 max-w-5xl rounded border border-stone-200 bg-white p-5 text-sm text-stone-600">
              まだお酒が登録されていません。
            </div>
          ) : null}
          <ShelfGrid items={items} />
        </>
      ) : null}
    </main>
  );
}
