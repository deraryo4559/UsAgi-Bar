import { Link } from 'react-router-dom';
import { BottlePlaceholder } from '../../components/ui/BottlePlaceholder';
import shelfUrl from '../../img/shelf-transparent.png';
import tanaUsagiUrl from '../../img/tanaUsagi.png';
import type { InventoryItem } from '../../types/inventory';

const ITEMS_PER_ROW_DESKTOP = 5;
const ITEMS_PER_ROW_MOBILE = 3;

type ShelfRowLayout = {
  topPct: number;
  floorPct: number;
  leftPct: number;
  rightPct: number;
};

/**
 * shelf.png / shelf-transparent.png (941x1672) を1つの座標系として扱う。
 * topPct から floorPct までが商品画像の置き場で、商品の下端は floorPct に揃える。
 * ラベルと残量バーは floorPct の少し下に別レイヤーで置き、接地位置に影響させない。
 */
const SHELF_ROWS: ShelfRowLayout[] = [
  { topPct: 8.4, floorPct: 18.95, leftPct: 13.2, rightPct: 13.2 },
  { topPct: 22.0, floorPct: 33.6, leftPct: 10.8, rightPct: 10.8 },
  { topPct: 36.55, floorPct: 48.25, leftPct: 10.8, rightPct: 10.8 },
  { topPct: 51.15, floorPct: 62.85, leftPct: 10.8, rightPct: 10.8 },
  { topPct: 65.85, floorPct: 77.45, leftPct: 10.8, rightPct: 10.8 },
  { topPct: 80.45, floorPct: 91.5, leftPct: 11.2, rightPct: 11.2 },
];

const SHELF_ROW_COUNT = SHELF_ROWS.length;

type ShelfItemSize = {
  heightPct: number;
  widthPct: number;
};

const defaultItemSizes: Record<InventoryItem['item_type'], ShelfItemSize> = {
  alcohol: { heightPct: 91, widthPct: 78 },
  drink: { heightPct: 82, widthPct: 84 },
  mixer: { heightPct: 78, widthPct: 82 },
  other: { heightPct: 78, widthPct: 80 },
};

function chunkItems(items: InventoryItem[], itemsPerRow: number) {
  const rows: InventoryItem[][] = Array.from(
    { length: SHELF_ROW_COUNT },
    () => [],
  );

  items.slice(0, SHELF_ROW_COUNT * itemsPerRow).forEach((item, index) => {
    const rowIndex = Math.floor(index / itemsPerRow);

    if (rowIndex < SHELF_ROW_COUNT) {
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
    return { heightPct: 73, widthPct: 74 };
  }

  if (/牛乳|milk|オレンジジュース|ジュース|コーラ|cola/.test(searchableText)) {
    return { heightPct: 78, widthPct: 88 };
  }

  if (/トニック|ソーダ|炭酸|ジンジャーエール/.test(searchableText)) {
    return { heightPct: 80, widthPct: 82 };
  }

  return size;
}

function ShelfItem({
  item,
  rowHeightPct,
}: {
  item: InventoryItem;
  rowHeightPct: number;
}) {
  const percent = remainingPercent(item);
  const size = getShelfItemSize(item);

  return (
    <Link
      to={`/item/${item.id}`}
      className="group relative block h-full min-w-0 outline-none"
      aria-label={`${item.name} の詳細を開く`}
    >
      <div className="absolute inset-x-0 bottom-0 flex h-full items-end justify-center">
        <div
          className="relative flex items-end justify-center"
          style={{
            height: `${size.heightPct}%`,
            width: `${size.widthPct}%`,
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-2px] left-1/2 h-[5px] w-[70%] -translate-x-1/2 rounded-full bg-black/35 blur-[3px]"
          />

          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="relative z-10 h-full w-full select-none object-contain object-bottom drop-shadow-[0_5px_5px_rgba(0,0,0,0.55)] transition-transform duration-150 group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5"
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
        style={{
          top: `calc(100% + clamp(2px, ${rowHeightPct * 0.16}vw, 7px))`,
        }}
      >
        <span className="max-w-full truncate rounded-[3px] bg-night-deep/88 px-1.5 py-[1px] text-center text-[8px] font-semibold leading-tight text-cream-50 ring-1 ring-night-glow/25 sm:text-[9px]">
          {item.name}
        </span>
        {percent !== null ? (
          <div
            className="h-[2px] w-[56%] overflow-hidden rounded-full bg-cream-50/20"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-night-glow"
              style={{ width: `${percent}%` }}
            />
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

  const heightPct = layout.floorPct - layout.topPct;

  return (
    <div
      className="absolute z-10"
      style={{
        left: `${layout.leftPct}%`,
        right: `${layout.rightPct}%`,
        top: `${layout.topPct}%`,
        height: `${heightPct}%`,
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
          <ShelfItem key={item.id} item={item} rowHeightPct={heightPct} />
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

  const desktopRows = chunkItems(sortedItems, ITEMS_PER_ROW_DESKTOP);
  const mobileRows = chunkItems(sortedItems, ITEMS_PER_ROW_MOBILE);

  return (
    <section aria-label="酒棚" className="relative w-full">
      <div className="relative mx-auto w-full max-w-[460px] sm:max-w-[540px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-[-4%] h-[10%] rounded-[50%] bg-black/55 blur-2xl"
        />

        <div
          className="relative w-full overflow-visible"
          style={{ aspectRatio: '941 / 1672' }}
        >
          <img
            src={shelfUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.6)]"
            draggable={false}
          />

          <div className="absolute inset-0 hidden sm:block">
            {SHELF_ROWS.map((layout, rowIndex) => (
              <ShelfRow
                key={`desktop-${rowIndex}`}
                items={desktopRows[rowIndex]}
                cols={ITEMS_PER_ROW_DESKTOP}
                layout={layout}
              />
            ))}
          </div>

          <div className="absolute inset-0 sm:hidden">
            {SHELF_ROWS.map((layout, rowIndex) => (
              <ShelfRow
                key={`mobile-${rowIndex}`}
                items={mobileRows[rowIndex]}
                cols={ITEMS_PER_ROW_MOBILE}
                layout={layout}
              />
            ))}
          </div>
        </div>

        <img
          src={tanaUsagiUrl}
          alt="うさぎ店主"
          className="pointer-events-none absolute -right-3 bottom-[-3%] z-20 w-[22%] max-w-[110px] select-none object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.55)] sm:-right-6 sm:w-[18%]"
          draggable={false}
        />
      </div>
    </section>
  );
}
