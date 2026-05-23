import { Link } from 'react-router-dom';
import shelfUrl from '../../img/shelf-transparent.png';
import tanaUsagiUrl from '../../img/tanaUsagi.png';
import { BottlePlaceholder } from '../../components/ui/BottlePlaceholder';
import type { InventoryItem } from '../../types/inventory';

const SHELF_ROWS = 6;
const ITEMS_PER_ROW_DESKTOP = 5;
const ITEMS_PER_ROW_MOBILE = 3;

/**
 * shelf-transparent.png (941 x 1672) の棚板位置を実測した結果。
 * 各段の「アイテムが乗る領域」を top% / height% で指定。
 *  - top:    棚板の上端付近（アイテムが座る位置）
 *  - height: その段の縦方向に使える高さ（次の棚板の上端まで）
 * 各段は左右の縦板の内側を使うため、left/right は別途共通値で指定。
 */
const ROW_GEOMETRY: { top: number; height: number }[] = [
  { top: 6.0, height: 13.5 },
  { top: 21.5, height: 12.5 },
  { top: 36.0, height: 12.0 },
  { top: 50.0, height: 11.5 },
  { top: 63.5, height: 13.0 },
  { top: 78.0, height: 11.0 },
];

/** 棚の左右の縦板を避けるための左右余白(%) */
const SHELF_INSET_X = 11;

function chunkItems(items: InventoryItem[], itemsPerRow: number) {
  const rows: InventoryItem[][] = Array.from({ length: SHELF_ROWS }, () => []);

  items.slice(0, SHELF_ROWS * itemsPerRow).forEach((item, index) => {
    const rowIndex = Math.floor(index / itemsPerRow);
    if (rowIndex < SHELF_ROWS) {
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

type ShelfItemTileProps = {
  item: InventoryItem;
};

function ShelfItemTile({ item }: ShelfItemTileProps) {
  const percent = remainingPercent(item);

  return (
    <Link
      to={`/item/${item.id}`}
      className="group relative flex h-full w-full flex-col items-center justify-end gap-0.5 outline-none"
      aria-label={`${item.name} の詳細を開く`}
    >
      {/* 画像エリア: 高さ統一・棚板に sit させるため object-position: bottom */}
      <div className="relative flex h-[78%] w-full items-end justify-center">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full select-none object-contain object-bottom drop-shadow-[0_3px_3px_rgba(0,0,0,0.45)] transition group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5"
            draggable={false}
          />
        ) : (
          <div className="h-full w-full transition group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5">
            <BottlePlaceholder itemType={item.item_type} />
          </div>
        )}
      </div>

      {/* 商品名ラベル: コンパクトに棚板の前面に */}
      <div className="z-10 w-[92%] truncate rounded-md bg-night-deep/80 px-1 py-[1px] text-center text-[9px] font-semibold text-cream-50 ring-1 ring-night-glow/30 backdrop-blur-sm">
        {item.name}
      </div>

      {/* 残量バー: 数px 高だけ */}
      {percent !== null ? (
        <div
          className="h-[2px] w-[70%] overflow-hidden rounded-full bg-cream-50/15"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-night-glow"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </Link>
  );
}

function renderRow(
  row: { top: number; height: number },
  items: InventoryItem[],
  cols: number,
) {
  return (
    <div
      className="absolute"
      style={{
        top: `${row.top}%`,
        height: `${row.height}%`,
        left: `${SHELF_INSET_X}%`,
        right: `${SHELF_INSET_X}%`,
      }}
    >
      <div
        className="grid h-full"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '4px' }}
      >
        {items.map((item) => (
          <ShelfItemTile key={item.id} item={item} />
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
        {/* 棚の足元の影 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-[-4%] h-[10%] rounded-[50%] bg-black/50 blur-2xl"
        />

        {/* 棚画像 + アイテム配置レイヤー */}
        <div
          className="relative w-full"
          style={{ aspectRatio: '941 / 1672' }}
        >
          <img
            src={shelfUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.55)]"
            draggable={false}
          />

          {/* デスクトップ・タブレット表示: 5列 */}
          <div className="absolute inset-0 hidden sm:block">
            {ROW_GEOMETRY.map((row, rowIndex) => (
              <div key={`d-${rowIndex}`}>
                {renderRow(row, desktopRows[rowIndex], ITEMS_PER_ROW_DESKTOP)}
              </div>
            ))}
          </div>

          {/* スマホ表示: 3列 */}
          <div className="absolute inset-0 sm:hidden">
            {ROW_GEOMETRY.map((row, rowIndex) => (
              <div key={`m-${rowIndex}`}>
                {renderRow(row, mobileRows[rowIndex], ITEMS_PER_ROW_MOBILE)}
              </div>
            ))}
          </div>
        </div>

        {/* 棚の右下に座るうさぎ店主 */}
        <img
          src={tanaUsagiUrl}
          alt="うさぎ店主"
          className="pointer-events-none absolute -right-3 bottom-[-3%] w-[22%] max-w-[110px] select-none object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.55)] sm:-right-6 sm:w-[18%]"
          draggable={false}
        />
      </div>
    </section>
  );
}
