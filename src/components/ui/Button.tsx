import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
    size?: 'sm' | 'md';
  }
>;

const variantClasses = {
  primary:
    'border-usagi-ink bg-usagi-ink text-cream-50 hover:bg-usagi-ink/90 shadow-soft',
  secondary:
    'border-cream-300 bg-white text-usagi-ink hover:bg-cream-50 shadow-chip',
  danger:
    'border-rose-700 bg-rose-700 text-white hover:bg-rose-600 shadow-soft',
  ghost:
    'border-transparent bg-transparent text-usagi-ink/80 hover:bg-cream-100',
  accent:
    'border-usagi-orange bg-usagi-orange text-white hover:bg-usagi-orange/90 shadow-soft',
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
