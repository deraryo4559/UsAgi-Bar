import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
    size?: 'sm' | 'md';
  }
>;

const variantClasses = {
  primary:
    'border-night-gold bg-night-gold text-night-deep hover:bg-night-glow shadow-neon',
  secondary:
    'border-night-gold/45 bg-night-warm/80 text-cream-50 hover:border-night-glow hover:bg-night-accent shadow-chip',
  danger:
    'border-rose-500 bg-rose-700 text-white hover:bg-rose-600 shadow-soft',
  ghost:
    'border-transparent bg-transparent text-cream-100/80 hover:bg-white/10',
  accent:
    'border-night-neon bg-night-neon text-white hover:bg-night-neon/90 shadow-neon',
} as const;

const sizeClasses = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
} as const;

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
