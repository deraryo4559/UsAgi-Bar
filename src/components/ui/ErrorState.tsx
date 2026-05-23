import type { ReactNode } from 'react';
import { MascotBubble } from './MascotBubble';

type ErrorStateProps = {
  title?: string;
  message: string;
  mascotMessage?: string;
  action?: ReactNode;
};

export function ErrorState({
  title = 'うまく読み込めませんでした',
  message,
  mascotMessage,
  action,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="grid gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 shadow-soft"
    >
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 whitespace-pre-wrap text-rose-900/90">{message}</p>
      </div>
      {mascotMessage ? <MascotBubble>{mascotMessage}</MascotBubble> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}
