import { describe, expect, it } from 'vitest';
import { calculateRemainingMl } from './inventoryItems';

describe('calculateRemainingMl', () => {
  it('calculates preset remaining_ml from volume_ml', () => {
    expect(calculateRemainingMl(700, 1)).toBe(700);
    expect(calculateRemainingMl(700, 0.75)).toBe(525);
    expect(calculateRemainingMl(700, 0.5)).toBe(350);
    expect(calculateRemainingMl(700, 0.25)).toBe(175);
  });

  it('sets empty to 0 even when volume_ml is unknown', () => {
    expect(calculateRemainingMl(null, 0)).toBe(0);
  });
});
