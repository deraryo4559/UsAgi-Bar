import { Link } from 'react-router-dom';
import { BottlePlaceholder } from '../../components/ui/BottlePlaceholder';
import shelfUrl from '../../img/shelf-transparent.png';
import tanaUsagiUrl from '../../img/tanaUsagi.png';
import type { InventoryItem } from '../../types/inventory';
import {
  DESKTOP_ITEMS_PER_ROW,
  MOBILE_ITEMS_PER_ROW,
  SHELF_ASPECT_RATIO,
  SHELF_LABEL_BAND_HEIGHT,
  SHELF_ROWS,
  type ShelfRowLayout,
} from './shelfLayout';

type ShelfItemSize = {
  heightScale: number;
  widthPct: number;
};

const defaultItemSizes: Record<InventoryItem['item_type'], ShelfItemSize> = {
  alcohol: { heightScale: 1, widthPct: 72 },
  drink: { heightScale: 0.9, widthPct: 82 },
  mixer: { heightScale: 0.86, widthPct: 80 },
  other: { heightScale: 0.86, widthPct: 78 },
};

function chunkItems(items: InventoryItem[], itemsPerRow: number) {
  const rows: InventoryItem[][] = Array.from(
    { length: SHELF_ROWS.length },
    () => [],
  );

  items.slice(0, SHELF_ROWS.length * itemsPerRow).forEach((item, index) => {
    const rowIndex = Math.floor(index / itemsPerRow);

    if (rowIndex < SHELF_ROWS.length) {
      rows[rowIndex].push(item);
    }
  });

  return rows;
}

function remainingPercent(item: InventoryItem) {
  if (!item.volume_ml || item.remaining_ml === null) {
    return null;
  }

  return Math.max(
    0,
    Math.min(100, Math.round((item.remaining_ml / item.volume_ml) * 100)),
  );
}

function remainingTone(percent: number | null) {
  if (percent === null) return 'bg-cream-300';
  if (percent <= 0) return 'bg-rose-300';
  if (percent <= 25) return 'bg-usagi-orange';
  if (percent <= 60) return 'bg-amber-400';
  return 'bg-usagi-mint';
}

function normalizeText(value: string | null) {
  return value?.toLowerCase().replace(/\s+/g, '') ?? '';
}

function getShelfItemSize(item: InventoryItem): ShelfItemSize {
  const size = defaultItemSizes[item.item_type];
  const searchableText = [
    item.name,
    item.category,
    item.sub_category,
  ]
    .map(normalizeText)
    .join(' ');

  if (/ビール|beer|缶/.test(searchableText)) {
    return { heightScale: 0.8, widthPct: 68 };
  }

  if (/牛乳|milk|オレンジジュース|ジュース|コーラ|cola/.test(searchableText)) {
    return { heightScale: 0.84, widthPct: 86 };
  }

  if (/トニック|ソーダ|炭酸|ジンジャーエール/.test(searchableText)) {
    return { heightScale: 0.86, widthPct: 78 };
  }

  return size;
}

function ShelfItem({
  item,
  layout,
}: {
  item: InventoryItem;
  layout: ShelfRowLayout;
}) {
  const percent = remainingPercent(item);
  const size = getShelfItemSize(item);
  const rowBandHeight = layout.labelY - layout.topY + SHELF_LABEL_BAND_HEIGHT;
  const itemStagePct = ((layout.floorY - layout.topY) / rowBandHeight) * 100;
  const labelTopPct = ((layout.labelY - layout.topY) / rowBandHeight) * 100;
  const itemHeightPct = Math.min(
    96,
    Math.max(62, layout.itemHeight * size.heightScale),
  );

  return (
    <Link
      to={`/item/${item.id}`}
      className="group relative block h-full min-w-0 outline-none"
      aria-label={`${item.name} の詳細を開く`}
    >
      <div
        className="absolute inset-x-0 top-0 flex items-end justify-center"
        style={{ height: `${itemStagePct}%` }}
      >
        <div
          className="relative flex items-end justify-center"
          style={{
            height: `${itemHeightPct}%`,
            width: `${size.widthPct}%`,
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-2px] left-1/2 h-[5px] w-[72%] -translate-x-1/2 rounded-full bg-black/35 blur-[3px]"
          />

          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="shelf-product-image relative z-10 h-full w-full select-none object-contain object-bottom drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] transition-transform duration-150 group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5"
              draggable={false}
            />
          ) : (
            <div className="relative z-10 h-full w-full transition-transform duration-150 group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5">
              <BottlePlaceholder itemType={item.item_type} />
            </div>
          )}
        </div>
      </div>

      <div
        className="absolute left-1/2 z-20 flex w-[94%] -translate-x-1/2 flex-col items-center gap-[2px]"
        style={{ top: `${labelTopPct}%` }}
      >
        <span className="max-w-full truncate rounded-full border border-woody-600/30 bg-cream-50/88 px-1.5 py-[1px] text-center text-[7px] font-bold leading-tight text-woody-700 shadow-[0_1px_2px_rgba(70,38,15,0.32)] backdrop-blur-[1px] sm:text-[8px]">
          {item.name}
        </span>
        {percent !== null ? (
          <div className="flex w-[66%] min-w-8 items-center gap-[2px]">
            <div
              className="h-[3px] flex-1 overflow-hidden rounded-full bg-cream-50/45 ring-1 ring-woody-600/20"
              aria-hidden="true"
            >
              <div
                className={`h-full rounded-full ${remainingTone(percent)}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="hidden rounded-full bg-night-deep/65 px-1 text-[7px] font-bold leading-3 text-cream-50/95 sm:inline">
              {percent}%
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function ShelfRow({
  items,
  cols,
  layout,
}: {
  items: InventoryItem[];
  cols: number;
  layout: ShelfRowLayout;
}) {
  if (items.length === 0) {
    return null;
  }

  const rowBandHeight = layout.labelY - layout.topY + SHELF_LABEL_BAND_HEIGHT;

  return (
    <div
      className="absolute z-10"
      style={{
        left: `${layout.leftX}%`,
        right: `${layout.rightX}%`,
        top: `${layout.topY}%`,
        height: `${rowBandHeight}%`,
      }}
    >
      <div
        className="grid h-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          columnGap: 'clamp(3px, 1.1vw, 10px)',
        }}
      >
        {items.map((item) => (
          <ShelfItem key={item.id} item={item} layout={layout} />
        ))}
      </div>
    </div>
  );
}

type ShelfGridProps = {
  items: InventoryItem[];
};

export function ShelfGrid({ items }: ShelfGridProps) {
  const sortedItems = [...items].sort((a, b) => {
    const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const desktopRows = chunkItems(sortedItems, DESKTOP_ITEMS_PER_ROW);
  const mobileRows = chunkItems(sortedItems, MOBILE_ITEMS_PER_ROW);

  return (
    <section aria-label="酒棚" className="relative w-full">
      <div className="relative mx-auto w-[min(94vw,430px)] sm:w-[min(100%,560px)] lg:w-[min(100%,620px)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[8%] bottom-[-3%] h-[9%] rounded-[50%] bg-woody-700/35 blur-2xl"
        />

        <div
          className="relative w-full overflow-visible"
          style={{ aspectRatio: SHELF_ASPECT_RATIO }}
        >
          <img
            src={shelfUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-contain drop-shadow-[0_16px_26px_rgba(90,50,20,0.26)]"
            draggable={false}
          />

          <div className="pointer-events-none absolute left-[15%] top-[3.9%] z-20 rounded-full border border-woody-600/35 bg-cream-50/85 px-3 py-1 text-[11px] font-extrabold text-woody-700 shadow-chip backdrop-blur-[2px] sm:text-xs">
            ウサギBar
          </div>

          <div className="absolute inset-0 hidden sm:block">
            {SHELF_ROWS.map((layout, rowIndex) => (
              <ShelfRow
                key={`desktop-${layout.id}`}
                items={desktopRows[rowIndex]}
                cols={DESKTOP_ITEMS_PER_ROW}
                layout={layout}
              />
            ))}
          </div>

          <div className="absolute inset-0 sm:hidden">
            {SHELF_ROWS.map((layout, rowIndex) => (
              <ShelfRow
                key={`mobile-${layout.id}`}
                items={mobileRows[rowIndex]}
                cols={MOBILE_ITEMS_PER_ROW}
                layout={layout}
              />
            ))}
          </div>
        </div>

        <img
          src={tanaUsagiUrl}
          alt="うさぎ店主"
          className="pointer-events-none absolute right-[3%] top-[8.2%] z-30 w-[18%] max-w-[104px] select-none object-contain drop-shadow-[0_7px_7px_rgba(70,38,15,0.32)] sm:right-[4%] sm:w-[15%]"
          draggable={false}
        />
      </div>
    </section>
  );
}
