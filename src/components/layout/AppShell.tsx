import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

type AppShellProps = PropsWithChildren<{
  title: string;
  backTo?: string;
}>;

export function AppShell({ title, backTo = '/', children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-stone-900 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div>
            <Link
              to={backTo}
              className="text-sm font-medium text-stone-500 hover:text-stone-900"
            >
              戻る
            </Link>
            <h1 className="mt-1 text-xl font-bold">{title}</h1>
          </div>
          <Link
            to="/"
            className="rounded border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100"
          >
            酒棚
          </Link>
        </header>
        {children}
      </div>
    </main>
  );
}
