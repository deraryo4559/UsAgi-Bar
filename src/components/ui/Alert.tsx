import type { HTMLAttributes, PropsWithChildren } from 'react';

type AlertTone = 'info' | 'success' | 'warn' | 'error';

type AlertProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    tone?: AlertTone;
    title?: string;
  }
>;

const toneClasses: Record<AlertTone, string> = {
  info: 'bg-sky-400/15 border-sky-300/35 text-sky-100',
  success: 'bg-night-mint/15 border-night-mint/45 text-night-mint',
  warn: 'bg-night-orange/15 border-night-orange/45 text-night-glow',
  error: 'bg-rose-950/45 border-rose-400/45 text-rose-100',
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
