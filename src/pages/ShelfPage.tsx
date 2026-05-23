import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShelfGrid } from '../features/shelf/ShelfGrid';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import {
  listInventoryItems,
  sortInventoryItems,
} from '../features/inventory/api/inventoryItems';
import { toErrorMessage } from '../lib/supabase/errors';
import type { InventoryItem } from '../types/inventory';
import logoUrl from '../img/logo.png';

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
    <main
      className="relative min-h-screen overflow-x-hidden text-usagi-ink"
      style={{
        background:
          'radial-gradient(70% 46% at 50% 0%, rgba(255, 246, 219, 0.94) 0%, rgba(255, 246, 219, 0) 68%), linear-gradient(180deg, #fff7e6 0%, #fdf0cf 48%, #f7dfac 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-52 opacity-80"
        style={{
          background:
            'radial-gradient(36% 80% at 50% 0%, rgba(255, 198, 121, 0.38) 0%, rgba(255, 198, 121, 0) 74%)',
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18px 18px, rgba(154, 106, 58, 0.16) 1.2px, transparent 1.3px)',
          backgroundSize: '34px 34px',
        }}
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 pb-12 pt-4 sm:px-6 sm:pt-5">
        <header className="mx-auto flex w-full max-w-[620px] items-center justify-between gap-3 rounded-full border border-woody-200/90 bg-cream-50/82 px-3 py-2 shadow-soft backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/90 p-0.5 ring-1 ring-woody-300/70">
              <img
                src={logoUrl}
                alt="ウサギBar"
                className="h-11 w-11 rounded-full object-contain"
                draggable={false}
              />
            </div>
            <div className="leading-tight">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-usagi-orange drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
                  ウサギ
                </span>
                <span className="text-lg font-extrabold text-woody-700">
                  Bar
                </span>
              </div>
              <p className="text-[11px] font-semibold text-woody-500/80">
                — きょう、なに飲む? —
              </p>
            </div>
          </div>
          <Link
            to="/admin/login"
            className="rounded-full border border-woody-300 bg-white/72 px-3 py-1.5 text-xs font-bold text-woody-700 shadow-chip hover:bg-usagi-orange hover:text-white"
            aria-label="管理者画面へ"
          >
            管理
          </Link>
        </header>

        {isLoading ? (
          <div className="mx-auto w-full max-w-[620px] rounded-2xl border border-woody-200 bg-cream-50/78 p-3 text-woody-700 shadow-soft backdrop-blur">
            <LoadingState label="酒棚を整えています…" />
          </div>
        ) : null}

        {error ? (
          <ErrorState
            message={error}
            mascotMessage="カウンターの奥と連絡が取れん。少し待ってもう一回頼む。"
          />
        ) : null}

        {!isLoading && !error ? (
          items.length === 0 ? (
            <div className="mx-auto w-full max-w-[620px] rounded-2xl border border-woody-200 bg-cream-50/78 p-2 shadow-soft backdrop-blur">
              <EmptyState
                title="まだ酒棚が空っぽです"
                mascotMessage="まずは1本、置いてみるか。管理画面から登録できるぞ。"
                action={
                  <Link
                    to="/admin/login"
                    className="rounded-full border border-usagi-orange bg-usagi-orange px-4 py-2 text-sm font-bold text-white shadow-soft hover:bg-usagi-orange/90"
                  >
                    管理画面へ
                  </Link>
                }
              >
                管理者ログイン後、画像と一緒にお酒・ドリンク・割材を登録できます。
              </EmptyState>
            </div>
          ) : (
            <ShelfGrid items={items} />
          )
        ) : null}
      </div>
    </main>
  );
}
