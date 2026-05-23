import type { PropsWithChildren } from 'react';
import tanaUsagiUrl from '../../img/tanaUsagi.png';

type MascotBubbleProps = PropsWithChildren<{
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
  variant?: 'inline' | 'card';
  className?: string;
}>;

const sizeClasses = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
};

export function MascotBubble({
  children,
  size = 'sm',
  align = 'left',
  variant = 'inline',
  className = '',
}: MascotBubbleProps) {
  const wrapperBase =
    variant === 'card'
      ? 'rounded-2xl border border-cream-200 bg-white p-3 shadow-soft'
      : '';

  const flexDir = align === 'left' ? 'flex-row' : 'flex-row-reverse';
  const bubbleArrow =
    align === 'left' ? 'before:-left-1.5' : 'before:-right-1.5';

  return (
    <div
      className={`flex ${flexDir} items-center gap-3 ${wrapperBase} ${className}`}
    >
      <img
        src={tanaUsagiUrl}
        alt="うさぎ店主"
        className={`${sizeClasses[size]} shrink-0 select-none object-contain drop-shadow-sm`}
        draggable={false}
      />
      <div
        className={`relative max-w-[260px] rounded-2xl border border-usagi-ink/15 bg-white px-3 py-2 text-sm text-usagi-ink shadow-chip before:absolute before:top-3 before:h-3 before:w-3 before:rotate-45 before:border-l before:border-b before:border-usagi-ink/15 before:bg-white ${bubbleArrow}`}
      >
        {children}
      </div>
    </div>
  );
}
