import { describe, expect, it } from 'vitest';
import type { InventoryItem } from '../../../types/inventory';
import type { CategoryReferenceData } from './aiCandidateNormalization';
import { findSimilarInventoryItems } from './aiCandidateSimilarity';
import type { AiInventoryCandidate } from './types';

const timestamp = '2026-05-23T00:00:00.000Z';

const referenceData: CategoryReferenceData = {
  cocktailIngredients: [{ ingredient_name: 'ジン' }],
  ingredientAliases: [
    { canonical_name: 'ジン', alias_name: 'SUNTORY GIN SUI' },
    { canonical_name: 'ジン', alias_name: '翠' },
    { canonical_name: 'コーヒーリキュール', alias_name: 'Kahlúa' },
  ],
};

const candidate: AiInventoryCandidate = {
  candidate_id: 'candidate-1',
  name: 'SUNTORY GIN SUI',
  item_type: 'alcohol',
  category: 'ジン',
  sub_category: null,
  alcohol_percentage: 40,
  volume_ml: 700,
  remaining_ml: 700,
  memo: null,
  confidence: 0.9,
  needs_review: true,
  needs_review_reasons: [],
  evidence: {
    visible_text: ['SUNTORY GIN SUI', '翠'],
    visual_cues: [],
    inferred_fields: [],
    uncertainty_notes: [],
  },
};

function inventoryItem(partial: Partial<InventoryItem>): InventoryItem {
  return {
    id: 'item-1',
    name: 'SUNTORY GIN SUI',
    item_type: 'alcohol',
    category: 'ジン',
    sub_category: null,
    alcohol_percentage: 40,
    volume_ml: 700,
    remaining_ml: 700,
    image_url: null,
    memo: null,
    display_order: null,
    created_at: timestamp,
    updated_at: timestamp,
    ...partial,
  };
}

describe('findSimilarInventoryItems', () => {
  it('finds an existing item with an exact name match', () => {
    const matches = findSimilarInventoryItems({
      candidate,
      inventoryItems: [inventoryItem({ id: 'existing-sui' })],
      referenceData,
    });

    expect(matches[0]?.item.id).toBe('existing-sui');
    expect(matches[0]?.reasonCodes).toContain('name_exact');
  });

  it('finds an item with the same alias-normalized category and similar name', () => {
    const matches = findSimilarInventoryItems({
      candidate: {
        ...candidate,
        name: 'SUNTORY SUI',
        evidence: {
          ...candidate.evidence,
          visible_text: ['SUNTORY', 'SUI'],
        },
      },
      inventoryItems: [
        inventoryItem({
          id: 'existing-sui',
          name: 'SUNTORY GIN SUI',
          category: 'ジン',
        }),
      ],
      referenceData,
    });

    expect(matches[0]?.reasonCodes).toContain('category_name_similar');
  });

  it('finds an item when visible text contains the existing item name', () => {
    const matches = findSimilarInventoryItems({
      candidate: {
        ...candidate,
        name: '翠',
        category: '翠',
        evidence: {
          ...candidate.evidence,
          visible_text: ['SUNTORY GIN SUI', '翠'],
        },
      },
      inventoryItems: [
        inventoryItem({
          id: 'existing-sui',
          name: 'SUNTORY GIN SUI',
          category: 'ジン',
        }),
      ],
      referenceData,
    });

    expect(matches[0]?.reasonCodes).toContain(
      'visible_text_contains_existing_name',
    );
  });

  it('finds an item with the same category and close volume', () => {
    const matches = findSimilarInventoryItems({
      candidate: {
        ...candidate,
        name: '別のジン',
        category: 'ジン',
        volume_ml: 720,
        evidence: {
          ...candidate.evidence,
          visible_text: ['別のジン'],
        },
      },
      inventoryItems: [
        inventoryItem({
          id: 'existing-gin',
          name: '保存済みジン',
          category: 'ジン',
          volume_ml: 700,
        }),
      ],
      referenceData,
    });

    expect(matches[0]?.reasonCodes).toContain('category_volume_close');
  });

  it('excludes the item currently being edited', () => {
    const matches = findSimilarInventoryItems({
      candidate,
      inventoryItems: [inventoryItem({ id: 'editing-item' })],
      referenceData,
      excludeItemId: 'editing-item',
    });

    expect(matches).toEqual([]);
  });

  it('does not match unrelated inventory', () => {
    const matches = findSimilarInventoryItems({
      candidate,
      inventoryItems: [
        inventoryItem({
          id: 'tonic',
          name: 'トニックウォーター',
          item_type: 'drink',
          category: 'トニックウォーター',
          volume_ml: 500,
        }),
      ],
      referenceData,
    });

    expect(matches).toEqual([]);
  });
});
