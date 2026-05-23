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
  if (percent === null) return 'bg-cream-300/60';
  if (percent <= 0) return 'bg-night-neon';
  if (percent <= 25) return 'bg-night-orange';
  if (percent <= 60) return 'bg-night-gold';
  return 'bg-night-mint';
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
        <div className="mb-1 flex items-center justify-between text-[11px] text-cream-200/70">
          <span>残量</span>
          <span className="font-semibold text-cream-50">
            {percent === null ? '—' : `${percent}%`}
            {remainingMl !== null && volumeMl
              ? ` (${remainingMl}/${volumeMl}ml)`
              : ''}
          </span>
        </div>
      ) : null}
      <div
        className={`${trackHeight} w-full overflow-hidden rounded-full bg-black/45 ring-1 ring-night-gold/25`}
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
