import { Link } from 'react-router-dom';
import { BottlePlaceholder } from '../../components/ui/BottlePlaceholder';
import shelfUrl from '../../img/shelf-transparent.png';
import type { InventoryItem } from '../../types/inventory';
import { getInventoryDisplayImageUrl } from '../inventory/inventoryImages';
import {
  DESKTOP_ITEMS_PER_ROW,
  getItemXPositions,
  getShelfRowHeight,
  MOBILE_ITEMS_PER_ROW,
  SHELF_ASPECT_RATIO,
  SHELF_LABEL_BAND_HEIGHT,
  SHELF_ROWS,
  SHOW_SHELF_DEBUG,
  type ShelfRowLayout,
} from './shelfLayout';

type ShelfItemSize = {
  heightScale: number;
  widthPct: number;
};

const defaultItemSizes: Record<InventoryItem['item_type'], ShelfItemSize> = {
  alcohol: { heightScale: 1, widthPct: 70 },
  drink: { heightScale: 0.9, widthPct: 80 },
  mixer: { heightScale: 0.88, widthPct: 78 },
  other: { heightScale: 0.88, widthPct: 76 },
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
  if (percent === null) return 'bg-cream-300/60';
  if (percent <= 0) return 'bg-night-neon';
  if (percent <= 25) return 'bg-night-orange';
  if (percent <= 60) return 'bg-night-gold';
  return 'bg-night-mint';
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
    return { heightScale: 0.82, widthPct: 68 };
  }

  if (/牛乳|milk|オレンジジュース|ジュース|コーラ|cola/.test(searchableText)) {
    return { heightScale: 0.86, widthPct: 84 };
  }

  if (/トニック|ソーダ|炭酸|ジンジャーエール/.test(searchableText)) {
    return { heightScale: 0.88, widthPct: 76 };
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
  const displayImageUrl = getInventoryDisplayImageUrl(item);
  const size = getShelfItemSize(item);
  const rowBandHeight = layout.labelY - layout.topY + SHELF_LABEL_BAND_HEIGHT;
  const rowHeight = getShelfRowHeight(layout);
  const itemStagePct = ((layout.floorY - layout.topY) / rowBandHeight) * 100;
  const labelTopPct = ((layout.labelY - layout.topY) / rowBandHeight) * 100;
  const itemHeightPct = Math.min(
    94,
    Math.max(58, ((layout.itemHeight * size.heightScale) / rowHeight) * 100),
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
            className="pointer-events-none absolute bottom-[-2px] left-1/2 h-[6px] w-[76%] -translate-x-1/2 rounded-full bg-black/55 blur-[3px]"
          />

          {displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt={item.name}
              className="shelf-product-image relative z-10 h-full w-full select-none object-contain object-bottom drop-shadow-[0_8px_8px_rgba(0,0,0,0.62)] transition-transform duration-150 group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5"
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
        <span className="max-w-full truncate rounded-full border border-night-gold/40 bg-night-deep/80 px-1.5 py-[1px] text-center text-[7px] font-bold leading-tight text-cream-50 shadow-[0_0_10px_rgba(255,198,121,0.18)] backdrop-blur-[2px] sm:text-[8px]">
          {item.name}
        </span>
        {percent !== null ? (
          <div className="flex w-[66%] min-w-8 items-center gap-[2px]">
            <div
              className="h-[3px] flex-1 overflow-hidden rounded-full bg-black/55 ring-1 ring-night-gold/25"
              aria-hidden="true"
            >
              <div
                className={`h-full rounded-full ${remainingTone(percent)}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="hidden rounded-full border border-night-gold/25 bg-black/55 px-1 text-[7px] font-bold leading-3 text-cream-50/95 sm:inline">
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
  const slotCount = Math.min(cols, Math.max(items.length, 1));
  const positions = getItemXPositions(layout, slotCount);
  const slotWidth = (layout.rightX - layout.leftX) / cols;

  return (
    <div
      className="absolute inset-x-0 z-10"
      style={{
        top: `${layout.topY}%`,
        height: `${rowBandHeight}%`,
      }}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className="absolute top-0 h-full"
          style={{
            left: `${positions[index] - slotWidth / 2}%`,
            width: `${slotWidth}%`,
          }}
        >
          <ShelfItem item={item} layout={layout} />
        </div>
      ))}
    </div>
  );
}

function ShelfDebugOverlay() {
  if (!SHOW_SHELF_DEBUG) {
    return null;
  }

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-50">
      {SHELF_ROWS.map((row) => (
        <div key={row.id}>
          <div
            className="absolute inset-x-0 border-t border-sky-300/90 text-[8px]"
            style={{ top: `${row.topY}%` }}
          >
            <span className="ml-1 bg-sky-950/85 px-1 text-sky-100">
              row {row.id} topY
            </span>
          </div>
          <div
            className="absolute inset-x-0 border-t border-emerald-300/90 text-[8px]"
            style={{ top: `${row.floorY}%` }}
          >
            <span className="ml-1 bg-emerald-950/85 px-1 text-emerald-100">
              floorY
            </span>
          </div>
          <div
            className="absolute inset-x-0 border-t border-pink-300/90 text-[8px]"
            style={{ top: `${row.labelY}%` }}
          >
            <span className="ml-1 bg-pink-950/85 px-1 text-pink-100">
              labelY / itemHeight {row.itemHeight}
            </span>
          </div>
          <div
            className="absolute top-0 h-full border-l border-amber-300/90"
            style={{ left: `${row.leftX}%` }}
          />
          <div
            className="absolute top-0 h-full border-l border-amber-300/90"
            style={{ left: `${row.rightX}%` }}
          />
        </div>
      ))}
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
      <div className="relative mx-auto w-[min(94vw,440px)] sm:w-[min(100%,580px)] lg:w-[min(100%,650px)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[-16%] top-[1%] h-[24%] rounded-[50%] bg-night-glow/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[18%] top-[3%] h-[20%] rounded-[50%] bg-night-neon/15 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[7%] bottom-[-2%] h-[9%] rounded-[50%] bg-black/70 blur-2xl"
        />

        <div
          className="relative w-full overflow-visible rounded-[2rem]"
          style={{ aspectRatio: SHELF_ASPECT_RATIO }}
        >
          <img
            src={shelfUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-contain drop-shadow-[0_24px_34px_rgba(0,0,0,0.72)]"
            draggable={false}
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[13%] top-[4.5%] z-[1] h-[16%] rounded-[50%] bg-night-glow/20 blur-2xl"
          />

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

          <ShelfDebugOverlay />
        </div>
      </div>
    </section>
  );
}
