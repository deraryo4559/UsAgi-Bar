import { describe, expect, it } from 'vitest';
import {
  getItemXPositions,
  getShelfRowHeight,
  SHELF_ROWS,
} from './shelfLayout';

describe('shelfLayout', () => {
  it('calculates centered x positions for one item', () => {
    const row = SHELF_ROWS[1];

    const positions = getItemXPositions(row, 1);

    expect(positions).toHaveLength(1);
    expect(positions[0]).toBeCloseTo((row.leftX + row.rightX) / 2);
  });

  it('calculates balanced x positions for two items', () => {
    const row = SHELF_ROWS[1];

    const positions = getItemXPositions(row, 2);

    expect(positions).toHaveLength(2);
    expect(positions[0]).toBeLessThan(positions[1]);
    expect(positions[0] + positions[1]).toBeCloseTo(
      row.leftX + row.rightX,
    );
  });

  it('calculates increasing x positions for five items', () => {
    const row = SHELF_ROWS[1];

    const positions = getItemXPositions(row, 5);

    expect(positions).toHaveLength(5);
    positions.slice(1).forEach((position, index) => {
      expect(position).toBeGreaterThan(positions[index]);
    });
    expect(positions[0]).toBeGreaterThan(row.leftX);
    expect(positions.at(-1)).toBeLessThan(row.rightX);
  });

  it('keeps each shelf row internally valid', () => {
    SHELF_ROWS.forEach((row) => {
      expect(row.leftX).toBeLessThan(row.rightX);
      expect(row.maxItems).toBeGreaterThanOrEqual(1);
      expect(row.labelY).toBeGreaterThan(row.floorY);
      expect(row.itemHeight).toBeLessThanOrEqual(getShelfRowHeight(row));
    });
  });
});
