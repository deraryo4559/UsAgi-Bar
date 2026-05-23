import { describe, expect, it } from 'vitest';
import {
  extractInventoryImagePathFromPublicUrl,
  validateInventoryImageFile,
} from './storage';

describe('extractInventoryImagePathFromPublicUrl', () => {
  it('extracts inventory image paths from Supabase public URLs', () => {
    expect(
      extractInventoryImagePathFromPublicUrl(
        'https://example.supabase.co/storage/v1/object/public/inventory-images/inventory/2026-05-23/mitake.jpg',
      ),
    ).toBe('inventory/2026-05-23/mitake.jpg');
  });

  it('rejects non-inventory bucket URLs', () => {
    expect(
      extractInventoryImagePathFromPublicUrl(
        'https://example.supabase.co/storage/v1/object/public/avatars/inventory/2026-05-23/mitake.jpg',
      ),
    ).toBeNull();
  });

  it('rejects unsupported image MIME types before upload', () => {
    expect(() =>
      validateInventoryImageFile(
        new File(['svg'], 'label.svg', { type: 'image/svg+xml' }),
      ),
    ).toThrow('画像形式');
  });
});
