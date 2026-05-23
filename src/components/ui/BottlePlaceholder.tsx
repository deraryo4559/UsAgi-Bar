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
      <div className="relative flex h-full w-[46%] min-w-6 max-w-12 flex-col items-center">
        <div className={`-mb-px h-[13%] w-[54%] rounded-t-sm ${tone.cap}`} />
        <div
          className={`h-[87%] w-full rounded-b-sm rounded-t-md border border-woody-400/70 bg-gradient-to-b ${tone.body} shadow-inner`}
        >
          <div className="mx-auto mt-[30%] h-[32%] w-[72%] rounded border border-white/60 bg-white/60" />
        </div>
      </div>
    </div>
  );
}
