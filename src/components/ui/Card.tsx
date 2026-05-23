import type { HTMLAttributes, PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    tone?: 'default' | 'cream' | 'sub';
    padded?: boolean;
  }
>;

const toneClasses = {
  default: 'bg-white border-cream-200',
  cream: 'bg-cream-50 border-cream-200',
  sub: 'bg-cream-100 border-cream-200',
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
      className={`rounded-2xl border ${toneClasses[tone]} shadow-soft ${
        padded ? 'p-4 sm:p-5' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
