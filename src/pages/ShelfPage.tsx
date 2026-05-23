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
      className="relative min-h-screen overflow-hidden text-cream-50"
      style={{
        // 夜の自宅バー風 暖色グラデーション背景
        background:
          'radial-gradient(120% 80% at 50% 20%, #3a2517 0%, #21160e 45%, #140f0b 80%, #0a0705 100%)',
      }}
    >
      {/* 上部の暖色光（バーカウンターの間接照明イメージ） */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[60vh] opacity-70"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(255, 198, 121, 0.35) 0%, rgba(255, 198, 121, 0) 70%)',
        }}
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-5 px-3 pb-12 pt-4 sm:px-6 sm:pt-6">
        <header className="flex items-center justify-between gap-3 rounded-2xl border border-night-accent/80 bg-night-warm/70 px-3 py-2.5 shadow-soft backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-cream-50 p-0.5 ring-1 ring-night-glow/40">
              <img
                src={logoUrl}
                alt="ウサギBar"
                className="h-11 w-11 rounded-full bg-white object-contain"
                draggable={false}
              />
            </div>
            <div className="leading-tight">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-usagi-pink drop-shadow-[0_1px_0_rgba(0,0,0,0.35)]">
                  ウサギ
                </span>
                <span className="text-lg font-extrabold text-cream-50">
                  Bar
                </span>
              </div>
              <p className="text-[11px] text-cream-200/70">
                — きょう、なに飲む? —
              </p>
            </div>
          </div>
          <Link
            to="/admin/login"
            className="rounded-full border border-cream-200/30 bg-cream-50/10 px-3 py-1.5 text-xs font-semibold text-cream-50/90 backdrop-blur hover:bg-cream-50/20"
            aria-label="管理者画面へ"
          >
            管理
          </Link>
        </header>

        {isLoading ? (
          <div className="rounded-2xl border border-night-accent/60 bg-night-warm/60 p-3 text-cream-50/90 shadow-soft backdrop-blur">
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
            <div className="rounded-2xl border border-night-accent/60 bg-night-warm/60 p-2 shadow-soft backdrop-blur">
              <EmptyState
                title="まだ酒棚が空っぽです"
                mascotMessage="まずは1本、置いてみるか。管理画面から登録できるぞ。"
                action={
                  <Link
                    to="/admin/login"
                    className="rounded-full border border-usagi-orange bg-usagi-orange px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-usagi-orange/90"
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
