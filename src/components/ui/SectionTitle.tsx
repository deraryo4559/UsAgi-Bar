import type { PropsWithChildren, ReactNode } from 'react';

type SectionTitleProps = PropsWithChildren<{
  icon?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  level?: 2 | 3;
}>;

export function SectionTitle({
  children,
  icon,
  description,
  actions,
  level = 2,
}: SectionTitleProps) {
  const HeadingTag = level === 2 ? 'h2' : 'h3';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon ? (
          <span aria-hidden="true" className="text-lg">
            {icon}
          </span>
        ) : null}
        <div>
          <HeadingTag
            className={
              level === 2
                ? 'text-lg font-bold text-usagi-ink'
                : 'text-base font-bold text-usagi-ink'
            }
          >
            {children}
          </HeadingTag>
          {description ? (
            <p className="mt-0.5 text-xs text-usagi-ink/70">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
