import type { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import logoUrl from '../../img/logo.png';

type AppShellProps = PropsWithChildren<{
  title: string;
  backTo?: string;
  subtitle?: string;
  headerActions?: ReactNode;
  variant?: 'default' | 'admin';
}>;

export function AppShell({
  title,
  backTo = '/',
  subtitle,
  headerActions,
  variant = 'default',
  children,
}: AppShellProps) {
  const showShelfLink = variant !== 'default' || backTo !== '/';

  return (
    <main className="min-h-screen bg-cream-100 px-4 py-5 text-usagi-ink sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white/80 px-4 py-3 shadow-soft backdrop-blur">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="酒棚に戻る" className="shrink-0">
              <img
                src={logoUrl}
                alt="ウサギBar"
                className="h-10 w-10 rounded-full bg-white object-contain ring-1 ring-cream-300"
                draggable={false}
              />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-usagi-pink">
                  ウサギ
                </span>
                <span className="text-sm font-bold tracking-wide text-usagi-ink">
                  Bar
                </span>
                <span className="text-xs text-usagi-ink/50">/ {title}</span>
              </div>
              {subtitle ? (
                <p className="mt-0.5 text-xs text-usagi-ink/60">{subtitle}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {backTo !== '/' ? (
              <Link
                to={backTo}
                className="rounded-full border border-cream-300 bg-white px-3 py-1.5 text-xs font-semibold text-usagi-ink/80 hover:bg-cream-50"
              >
                ← 戻る
              </Link>
            ) : null}
            {showShelfLink ? (
              <Link
                to="/"
                className="rounded-full border border-cream-300 bg-white px-3 py-1.5 text-xs font-semibold text-usagi-ink/80 hover:bg-cream-50"
              >
                酒棚へ
              </Link>
            ) : null}
            {headerActions}
          </div>
        </header>
        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </main>
  );
}
