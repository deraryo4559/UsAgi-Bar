import type { HTMLAttributes, PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    tone?: 'default' | 'cream' | 'sub';
    padded?: boolean;
  }
>;

const toneClasses = {
  default: 'bg-night-ink/90 border-night-gold/30 text-cream-50',
  cream: 'bg-night-warm/90 border-night-gold/30 text-cream-50',
  sub: 'bg-black/35 border-night-gold/25 text-cream-50',
} as const;

export function Card({
  children,
  className = '',
  tone = 'default',
  padded = true,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border ${toneClasses[tone]} shadow-bar backdrop-blur ${
        padded ? 'p-4 sm:p-5' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
