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
      className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-white/80 px-4 py-3 text-sm text-usagi-ink/80 shadow-soft"
    >
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 animate-pulse rounded-full bg-usagi-orange"
      />
      <div>
        <div className="font-medium">{label}</div>
        {hint ? <div className="text-xs text-usagi-ink/60">{hint}</div> : null}
      </div>
    </div>
  );
}
