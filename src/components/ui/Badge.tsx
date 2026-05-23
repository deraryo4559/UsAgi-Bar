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
  neutral: 'bg-black/35 text-cream-100 border-night-gold/30',
  makeable: 'bg-night-mint/15 text-night-mint border-night-mint/55',
  near: 'bg-night-orange/15 text-night-orange border-night-orange/55',
  warn: 'bg-night-orange/15 text-night-glow border-night-orange/55',
  info: 'bg-sky-400/15 text-sky-200 border-sky-300/35',
  accent: 'bg-night-gold/15 text-night-glow border-night-gold/50',
  mint: 'bg-night-mint/15 text-night-mint border-night-mint/55',
  pink: 'bg-night-neon/15 text-pink-200 border-night-neon/55',
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
