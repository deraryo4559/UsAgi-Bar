type LoadingStateProps = {
  label?: string;
  hint?: string;
};

export function LoadingState({
  label = '読み込み中',
  hint,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-2xl border border-night-gold/30 bg-night-ink/80 px-4 py-3 text-sm text-cream-100/80 shadow-bar"
    >
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 animate-pulse rounded-full bg-night-glow"
      />
      <div>
        <div className="font-medium">{label}</div>
        {hint ? <div className="text-xs text-cream-200/60">{hint}</div> : null}
      </div>
    </div>
  );
}
