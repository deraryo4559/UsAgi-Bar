import { describe, expect, it } from 'vitest';
import {
  emptyInventoryItemFormValues,
  formValuesToInventoryItemInput,
} from './inventoryForm';

describe('inventory form values', () => {
  it('keeps thumbnail fields when mapping to inventory input', () => {
    expect(
      formValuesToInventoryItemInput({
        ...emptyInventoryItemFormValues,
        name: '三岳',
        thumbnail_url: 'https://example.com/thumb.png',
        thumbnail_prompt: 'A clean illustrated shochu bottle thumbnail.',
        thumbnail_provider: 'cloudflare-workers-ai',
        thumbnail_generated_at: '2026-05-25T00:00:00.000Z',
      }),
    ).toMatchObject({
      name: '三岳',
      thumbnail_url: 'https://example.com/thumb.png',
      thumbnail_prompt: 'A clean illustrated shochu bottle thumbnail.',
      thumbnail_provider: 'cloudflare-workers-ai',
      thumbnail_generated_at: '2026-05-25T00:00:00.000Z',
    });
  });

  it('allows registration without a generated thumbnail', () => {
    expect(
      formValuesToInventoryItemInput({
        ...emptyInventoryItemFormValues,
        name: '三岳',
      }),
    ).toMatchObject({
      name: '三岳',
      thumbnail_url: null,
      thumbnail_prompt: null,
      thumbnail_provider: null,
      thumbnail_generated_at: null,
    });
  });
});
