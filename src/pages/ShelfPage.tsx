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
      className="relative min-h-screen overflow-x-hidden text-cream-50"
      style={{
        background:
          'radial-gradient(70% 38% at 50% 0%, rgba(255, 198, 121, 0.18) 0%, rgba(255, 198, 121, 0) 62%), radial-gradient(54% 42% at 50% 42%, rgba(255, 95, 162, 0.09) 0%, rgba(255, 95, 162, 0) 70%), linear-gradient(180deg, #05060a 0%, #0a0c12 44%, #160d08 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-90"
        style={{
          background:
            'radial-gradient(30% 80% at 50% 0%, rgba(255, 198, 121, 0.34) 0%, rgba(255, 198, 121, 0) 74%)',
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-[0.16]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18px 18px, rgba(255, 198, 121, 0.2) 1px, transparent 1.2px), radial-gradient(circle at 46px 54px, rgba(255, 95, 162, 0.16) 0.9px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 pb-12 pt-4 sm:px-6 sm:pt-5">
        <header className="mx-auto flex w-full max-w-[650px] flex-wrap items-center justify-between gap-2 rounded-3xl border border-night-gold/35 bg-black/40 px-3 py-2 shadow-bar backdrop-blur-md sm:rounded-full">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-full bg-black/55 p-0.5 ring-1 ring-night-gold/45 shadow-neon">
              <img
                src={logoUrl}
                alt="ウサギBar"
                className="h-11 w-11 rounded-full object-contain"
                draggable={false}
              />
            </div>
            <div className="leading-tight">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-night-glow drop-shadow-[0_0_12px_rgba(255,198,121,0.45)]">
                  ウサギ
                </span>
                <span className="text-lg font-extrabold text-night-neon drop-shadow-[0_0_14px_rgba(255,95,162,0.5)]">
                  Bar
                </span>
              </div>
              <p className="text-[11px] font-semibold text-cream-200/80">
                — きょう、なに飲む? —
              </p>
            </div>
          </div>
          <Link
            to="/admin/login"
            className="shrink-0 rounded-full border border-night-gold/45 bg-night-warm/70 px-3 py-1.5 text-xs font-bold text-night-glow shadow-chip hover:border-night-neon hover:text-cream-50"
            aria-label="管理者画面へ"
          >
            管理
          </Link>
        </header>

        {isLoading ? (
          <div className="mx-auto w-full max-w-[650px] rounded-2xl border border-night-gold/30 bg-night-ink/75 p-3 text-cream-100 shadow-bar backdrop-blur">
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
            <div className="mx-auto w-full max-w-[650px] rounded-2xl border border-night-gold/30 bg-night-ink/75 p-2 shadow-bar backdrop-blur">
              <EmptyState
                title="まだ酒棚が空っぽです"
                mascotMessage="まずは1本、置いてみるか。管理画面から登録できるぞ。"
                action={
                  <Link
                    to="/admin/login"
                    className="rounded-full border border-night-gold bg-night-gold px-4 py-2 text-sm font-bold text-night-deep shadow-neon hover:bg-night-glow"
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
