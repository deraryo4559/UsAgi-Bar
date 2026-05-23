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
    body: 'from-woody-100 via-cream-50 to-woody-300',
    cap: 'bg-woody-500',
  },
  drink: {
    body: 'from-sky-100 via-cream-50 to-sky-300',
    cap: 'bg-sky-600',
  },
  mixer: {
    body: 'from-usagi-pinkSoft via-white to-usagi-pink',
    cap: 'bg-rose-500',
  },
  other: {
    body: 'from-usagi-mintSoft via-white to-usagi-mint',
    cap: 'bg-emerald-600',
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
      <div className="relative flex h-full w-[58%] flex-col items-center">
        <div className={`-mb-0.5 h-[14%] w-[55%] rounded-t ${tone.cap}`} />
        <div
          className={`h-[86%] w-full rounded-t-md rounded-b-sm border border-woody-400/70 bg-gradient-to-b ${tone.body} shadow-inner`}
        >
          <div className="mx-auto mt-[28%] h-[34%] w-[78%] rounded border border-white/60 bg-white/55" />
        </div>
      </div>
    </div>
  );
}
