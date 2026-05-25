import { describe, expect, it } from 'vitest';
import type { InventoryItem } from '../../types/inventory';
import {
  getInventoryDisplayImageUrl,
  hasGeneratedThumbnail,
} from './inventoryImages';

const baseItem: InventoryItem = {
  id: 'item-1',
  name: 'テスト',
  item_type: 'alcohol',
  category: null,
  sub_category: null,
  alcohol_percentage: null,
  volume_ml: null,
  remaining_ml: null,
  image_url: null,
  thumbnail_url: null,
  thumbnail_prompt: null,
  thumbnail_provider: null,
  thumbnail_generated_at: null,
  memo: null,
  display_order: null,
  created_at: '2026-05-25T00:00:00Z',
  updated_at: '2026-05-25T00:00:00Z',
};

describe('inventory image helpers', () => {
  it('uses thumbnail_url before image_url', () => {
    expect(
      getInventoryDisplayImageUrl({
        ...baseItem,
        image_url: 'https://example.com/original.png',
        thumbnail_url: 'https://example.com/thumb.png',
      }),
    ).toBe('https://example.com/thumb.png');
  });

  it('falls back to image_url when thumbnail_url is missing', () => {
    expect(
      getInventoryDisplayImageUrl({
        ...baseItem,
        image_url: 'https://example.com/original.png',
      }),
    ).toBe('https://example.com/original.png');
  });

  it('detects whether a generated thumbnail exists', () => {
    expect(hasGeneratedThumbnail(baseItem)).toBe(false);
    expect(
      hasGeneratedThumbnail({
        ...baseItem,
        thumbnail_url: 'https://example.com/thumb.png',
      }),
    ).toBe(true);
  });
});
