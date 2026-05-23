import type { HTMLAttributes, PropsWithChildren } from 'react';

type AlertTone = 'info' | 'success' | 'warn' | 'error';

type AlertProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    tone?: AlertTone;
    title?: string;
  }
>;

const toneClasses: Record<AlertTone, string> = {
  info: 'bg-sky-50 border-sky-200 text-sky-900',
  success: 'bg-usagi-mintSoft border-usagi-mint text-emerald-900',
  warn: 'bg-amber-50 border-amber-200 text-amber-900',
  error: 'bg-rose-50 border-rose-200 text-rose-900',
};

export function Alert({
  children,
  className = '',
  tone = 'info',
  title,
  ...rest
}: AlertProps) {
  return (
    <div
      role={tone === 'error' || tone === 'warn' ? 'alert' : undefined}
      className={`rounded-xl border px-4 py-3 text-sm ${toneClasses[tone]} ${className}`}
      {...rest}
    >
      {title ? <div className="mb-0.5 font-bold">{title}</div> : null}
      <div>{children}</div>
    </div>
  );
}
