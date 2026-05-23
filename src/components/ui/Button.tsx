import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger';
  }
>;

const variantClasses = {
  primary: 'border-stone-900 bg-stone-900 text-white hover:bg-stone-700',
  secondary: 'border-stone-300 bg-white text-stone-900 hover:bg-stone-100',
  danger: 'border-red-800 bg-red-800 text-white hover:bg-red-700',
};

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
