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
    <main
      className="min-h-screen px-4 py-5 text-cream-50 sm:px-6"
      style={{
        background:
          'radial-gradient(70% 42% at 50% 0%, rgba(255, 198, 121, 0.14) 0%, rgba(255, 198, 121, 0) 62%), linear-gradient(180deg, #05060a 0%, #0a0c12 48%, #160d08 100%)',
      }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-night-gold/35 bg-black/40 px-4 py-3 shadow-bar backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="酒棚に戻る" className="shrink-0">
              <img
                src={logoUrl}
                alt="ウサギBar"
                className="h-10 w-10 rounded-full bg-black/45 object-contain ring-1 ring-night-gold/45"
                draggable={false}
              />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-night-glow">
                  ウサギ
                </span>
                <span className="text-sm font-bold tracking-wide text-night-neon">
                  Bar
                </span>
                <span className="text-xs text-cream-200/60">/ {title}</span>
              </div>
              {subtitle ? (
                <p className="mt-0.5 text-xs text-cream-200/60">{subtitle}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {backTo !== '/' ? (
              <Link
                to={backTo}
                className="rounded-full border border-night-gold/35 bg-night-warm/70 px-3 py-1.5 text-xs font-semibold text-cream-100 hover:border-night-neon hover:text-white"
              >
                ← 戻る
              </Link>
            ) : null}
            {showShelfLink ? (
              <Link
                to="/"
                className="rounded-full border border-night-gold/35 bg-night-warm/70 px-3 py-1.5 text-xs font-semibold text-cream-100 hover:border-night-neon hover:text-white"
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
