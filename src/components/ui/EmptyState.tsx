import type { PropsWithChildren, ReactNode } from 'react';
import { MascotBubble } from './MascotBubble';

type EmptyStateProps = PropsWithChildren<{
  title: string;
  mascotMessage?: string;
  action?: ReactNode;
}>;

export function EmptyState({
  title,
  mascotMessage,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="grid gap-4 rounded-2xl border border-dashed border-cream-300 bg-white/70 p-6 text-center shadow-soft">
      <h3 className="text-base font-bold text-usagi-ink">{title}</h3>
      {children ? (
        <p className="text-sm text-usagi-ink/70">{children}</p>
      ) : null}
      {mascotMessage ? (
        <div className="flex justify-center">
          <MascotBubble size="md">{mascotMessage}</MascotBubble>
        </div>
      ) : null}
      {action ? <div className="flex justify-center">{action}</div> : null}
    </div>
  );
}
