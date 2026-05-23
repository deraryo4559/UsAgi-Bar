import type { InventoryItem } from '../../types/inventory';

type BottlePlaceholderProps = {
  itemType: InventoryItem['item_type'];
  className?: string;
};

const toneByType: Record<
  InventoryItem['item_type'],
  { body: string; cap: string }
> = {
  alcohol: {
    body: 'from-night-glow/90 via-amber-200/80 to-night-wood',
    cap: 'bg-night-gold',
  },
  drink: {
    body: 'from-cyan-200/75 via-cream-50/80 to-night-navy',
    cap: 'bg-cyan-500',
  },
  mixer: {
    body: 'from-night-neon/70 via-rose-100/80 to-night-mid',
    cap: 'bg-night-neon',
  },
  other: {
    body: 'from-night-mint/75 via-emerald-100/75 to-night-navy',
    cap: 'bg-night-mint',
  },
};

export function BottlePlaceholder({
  itemType,
  className = '',
}: BottlePlaceholderProps) {
  const tone = toneByType[itemType];

  return (
    <div
      className={`relative flex h-full w-full items-end justify-center ${className}`}
      aria-hidden="true"
    >
      <div className="relative flex h-full w-[44%] min-w-5 max-w-12 flex-col items-center drop-shadow-[0_8px_8px_rgba(0,0,0,0.55)]">
        <div className={`-mb-px h-[13%] w-[54%] rounded-t-sm ${tone.cap}`} />
        <div
          className={`relative h-[87%] w-full overflow-hidden rounded-b-sm rounded-t-md border border-night-gold/40 bg-gradient-to-b ${tone.body} shadow-inner`}
        >
          <div className="absolute inset-x-[16%] top-[8%] h-[18%] rounded-sm bg-white/35" />
          <div className="mx-auto mt-[30%] h-[32%] w-[72%] rounded border border-night-gold/35 bg-black/30" />
        </div>
      </div>
    </div>
  );
}
