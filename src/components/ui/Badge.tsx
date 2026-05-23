import type { HTMLAttributes, PropsWithChildren } from 'react';

type BadgeTone =
  | 'neutral'
  | 'makeable'
  | 'near'
  | 'warn'
  | 'info'
  | 'accent'
  | 'mint'
  | 'pink';

type BadgeProps = PropsWithChildren<
  HTMLAttributes<HTMLSpanElement> & {
    tone?: BadgeTone;
    size?: 'sm' | 'md';
  }
>;

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-cream-100 text-usagi-ink border-cream-300',
  makeable: 'bg-usagi-mintSoft text-emerald-800 border-usagi-mint',
  near: 'bg-usagi-pinkSoft text-rose-800 border-usagi-pink',
  warn: 'bg-amber-50 text-amber-900 border-amber-300',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  accent: 'bg-usagi-orangeSoft text-usagi-orange border-usagi-orange',
  mint: 'bg-usagi-mintSoft text-emerald-800 border-usagi-mint',
  pink: 'bg-usagi-pinkSoft text-rose-800 border-usagi-pink',
};

const sizeClasses = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export function Badge({
  children,
  className = '',
  tone = 'neutral',
  size = 'md',
  ...rest
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${toneClasses[tone]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
