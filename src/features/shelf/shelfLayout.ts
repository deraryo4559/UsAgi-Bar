export type ShelfRowLayout = {
  id: number;
  topY: number;
  floorY: number;
  labelY: number;
  leftX: number;
  rightX: number;
  itemHeight: number;
  maxItems: number;
};

export const SHELF_ASPECT_RATIO = '941 / 1672';
export const DESKTOP_ITEMS_PER_ROW = 5;
export const MOBILE_ITEMS_PER_ROW = 3;
export const SHOW_SHELF_DEBUG = false;

/**
 * shelf-transparent.png (941x1672) の画像座標。
 * 数値は画像全体に対する%で、floorYが各段の接地点。
 * leftX / rightX は左右の境界座標、itemHeight は画像全体に対する高さ。
 */
export const SHELF_ROWS: ShelfRowLayout[] = [
  {
    id: 1,
    topY: 8.4,
    floorY: 18.95,
    labelY: 19.45,
    leftX: 13.2,
    rightX: 86.8,
    itemHeight: 9.25,
    maxItems: DESKTOP_ITEMS_PER_ROW,
  },
  {
    id: 2,
    topY: 22.0,
    floorY: 33.6,
    labelY: 34.1,
    leftX: 10.8,
    rightX: 89.2,
    itemHeight: 9.9,
    maxItems: DESKTOP_ITEMS_PER_ROW,
  },
  {
    id: 3,
    topY: 36.55,
    floorY: 48.25,
    labelY: 48.72,
    leftX: 10.8,
    rightX: 89.2,
    itemHeight: 9.95,
    maxItems: DESKTOP_ITEMS_PER_ROW,
  },
  {
    id: 4,
    topY: 51.15,
    floorY: 62.85,
    labelY: 63.32,
    leftX: 10.8,
    rightX: 89.2,
    itemHeight: 9.95,
    maxItems: DESKTOP_ITEMS_PER_ROW,
  },
  {
    id: 5,
    topY: 65.85,
    floorY: 77.45,
    labelY: 77.95,
    leftX: 10.8,
    rightX: 89.2,
    itemHeight: 9.85,
    maxItems: DESKTOP_ITEMS_PER_ROW,
  },
  {
    id: 6,
    topY: 80.45,
    floorY: 91.5,
    labelY: 92.05,
    leftX: 11.2,
    rightX: 88.8,
    itemHeight: 9.4,
    maxItems: DESKTOP_ITEMS_PER_ROW,
  },
];

export const SHELF_LABEL_BAND_HEIGHT = 2.2;

export function getShelfRowHeight(row: ShelfRowLayout) {
  return row.floorY - row.topY;
}

export function getShelfRowWidth(row: ShelfRowLayout) {
  return row.rightX - row.leftX;
}

export function getItemXPositions(row: ShelfRowLayout, itemCount: number) {
  const count = Math.max(1, Math.min(itemCount, row.maxItems));
  const rowWidth = getShelfRowWidth(row);
  const cellWidth = rowWidth / count;

  return Array.from(
    { length: count },
    (_, index) => row.leftX + cellWidth * (index + 0.5),
  );
}
