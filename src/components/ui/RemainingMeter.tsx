type RemainingMeterProps = {
  volumeMl: number | null;
  remainingMl: number | null;
  size?: 'sm' | 'md';
  showLabel?: boolean;
};

function calcPercent(volumeMl: number | null, remainingMl: number | null) {
  if (!volumeMl || remainingMl === null) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round((remainingMl / volumeMl) * 100)));
}

function toneFromPercent(percent: number | null) {
  if (percent === null) return 'bg-cream-200';
  if (percent <= 0) return 'bg-rose-300';
  if (percent <= 25) return 'bg-usagi-orange';
  if (percent <= 60) return 'bg-amber-400';
  return 'bg-usagi-mint';
}

export function RemainingMeter({
  volumeMl,
  remainingMl,
  size = 'md',
  showLabel = true,
}: RemainingMeterProps) {
  const percent = calcPercent(volumeMl, remainingMl);
  const tone = toneFromPercent(percent);
  const trackHeight = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className="w-full">
      {showLabel ? (
        <div className="mb-1 flex items-center justify-between text-[11px] text-usagi-ink/70">
          <span>残量</span>
          <span className="font-semibold text-usagi-ink">
            {percent === null ? '—' : `${percent}%`}
            {remainingMl !== null && volumeMl
              ? ` (${remainingMl}/${volumeMl}ml)`
              : ''}
          </span>
        </div>
      ) : null}
      <div
        className={`${trackHeight} w-full overflow-hidden rounded-full bg-cream-100 ring-1 ring-cream-200`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? 0}
      >
        <div
          className={`h-full rounded-full ${tone} transition-[width]`}
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
    </div>
  );
}
