import { describe, expect, it } from 'vitest';
import { emptyInventoryItemFormValues } from '../inventoryForm';
import {
  applyCandidateRegistrationResults,
  applyGeneratedThumbnailToCandidates,
  createEditableCandidatesFromAnalysis,
  getAiRegistrationStepMessage,
  getSelectedRegistrationInputs,
  removeEditableCandidate,
  setAllEditableCandidatesSelected,
  setEditableCandidateSelected,
  shouldFallbackToWholeImage,
  summarizeRegistrationResults,
  updateEditableCandidateValue,
} from './aiRegistrationFlow';
import type { CategoryReferenceData } from './aiCandidateNormalization';
import type {
  AiInventoryAnalysisResult,
  InventoryDetection,
} from './types';

const referenceData: CategoryReferenceData = {
  cocktailIngredients: [{ ingredient_name: 'ジン' }],
  ingredientAliases: [{ canonical_name: 'ジン', alias_name: 'SUNTORY SUI' }],
};

const analysisResult: AiInventoryAnalysisResult = {
  schema_version: 'ai_inventory_image_registration.v1',
  source: {
    kind: 'gemini_vision',
    image_path: 'inventory/crops/det-1.png',
  },
  image_assessment: {
    single_item_likely: true,
    multiple_items_likely: false,
    label_readable: true,
    needs_review: true,
    notes: null,
  },
  candidates: [
    {
      candidate_id: 'candidate-1',
      name: 'SUNTORY SUI',
      item_type: 'alcohol',
      category: 'SUNTORY SUI',
      sub_category: null,
      alcohol_percentage: null,
      volume_ml: 700,
      remaining_ml: null,
      memo: null,
      confidence: 0.88,
      needs_review: true,
      needs_review_reasons: [],
      evidence: {
        visible_text: ['SUNTORY SUI'],
        visual_cues: [],
        inferred_fields: [],
        uncertainty_notes: [],
      },
    },
  ],
};

const detections: InventoryDetection[] = [
  {
    detection_id: 'det-1',
    label: 'ジンのボトル',
    item_kind: 'alcohol',
    box_2d: { xmin: 100, ymin: 100, xmax: 300, ymax: 900 },
    confidence: 0.9,
    needs_review: true,
    notes: null,
  },
];

describe('aiRegistrationFlow', () => {
  it('provides compact step messages', () => {
    expect(getAiRegistrationStepMessage('detecting')).toContain(
      'お酒・ドリンク',
    );
  });

  it('falls back to whole image when detection returns zero items', () => {
    expect(shouldFallbackToWholeImage([])).toBe(true);
    expect(shouldFallbackToWholeImage(detections)).toBe(false);
  });

  it('converts Gemini Vision candidates into editable form values', () => {
    const candidates = createEditableCandidatesFromAnalysis({
      result: analysisResult,
      imageUrl: 'https://example.com/crop.png',
      imagePath: 'inventory/crops/det-1.png',
      sourceLabel: '検出 1',
      detectionId: 'det-1',
      referenceData,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].values).toMatchObject({
      name: 'SUNTORY SUI',
      category: 'ジン',
      volume_ml: '700',
      remaining_ml: '700',
      image_url: 'https://example.com/crop.png',
    });
    expect(candidates[0].values.thumbnail_prompt).toContain('no readable text');
  });

  it('keeps Gemini-provided thumbnail prompt in candidate form values', () => {
    const candidates = createEditableCandidatesFromAnalysis({
      result: {
        ...analysisResult,
        candidates: [
          {
            ...analysisResult.candidates[0],
            thumbnail_prompt: 'A custom thumbnail prompt, no readable text.',
          },
        ],
      },
      imageUrl: 'https://example.com/crop.png',
      imagePath: 'inventory/crops/det-1.png',
      sourceLabel: '検出 1',
      referenceData,
    });

    expect(candidates[0].values.thumbnail_prompt).toBe(
      'A custom thumbnail prompt, no readable text.',
    );
  });

  it('updates candidate form values without touching other candidates', () => {
    const candidates = createEditableCandidatesFromAnalysis({
      result: analysisResult,
      imageUrl: 'https://example.com/crop.png',
      imagePath: 'inventory/crops/det-1.png',
      sourceLabel: '検出 1',
      referenceData,
    });
    const updated = updateEditableCandidateValue(
      candidates,
      candidates[0].localId,
      'name',
      '翠',
    );

    expect(updated[0].values.name).toBe('翠');
    expect(candidates[0].values.name).toBe('SUNTORY SUI');
  });

  it('applies generated thumbnail fields to a candidate', () => {
    const candidates = createEditableCandidatesFromAnalysis({
      result: analysisResult,
      imageUrl: 'https://example.com/crop.png',
      imagePath: 'inventory/crops/det-1.png',
      sourceLabel: '検出 1',
      referenceData,
    });
    const localId = candidates[0].localId;
    const updated = applyGeneratedThumbnailToCandidates(
      candidates,
      localId,
      {
        url: 'https://example.com/thumb.png',
        path: 'thumbnails/thumb.png',
        provider: 'cloudflare-workers-ai',
        prompt: 'thumbnail prompt',
      },
      '2026-05-26T00:00:00.000Z',
    );

    expect(updated[0].values).toMatchObject({
      thumbnail_url: 'https://example.com/thumb.png',
      thumbnail_prompt: 'thumbnail prompt',
      thumbnail_provider: 'cloudflare-workers-ai',
      thumbnail_generated_at: '2026-05-26T00:00:00.000Z',
    });
  });

  it('selects, deselects and removes registration targets', () => {
    const candidates = createEditableCandidatesFromAnalysis({
      result: analysisResult,
      imageUrl: 'https://example.com/crop.png',
      imagePath: 'inventory/crops/det-1.png',
      sourceLabel: '検出 1',
      referenceData,
    });
    const localId = candidates[0].localId;

    expect(
      getSelectedRegistrationInputs(
        setEditableCandidateSelected(candidates, localId, false),
      ),
    ).toHaveLength(0);
    expect(getSelectedRegistrationInputs(setAllEditableCandidatesSelected(candidates, true)))
      .toHaveLength(1);
    expect(removeEditableCandidate(candidates, localId)).toHaveLength(0);
  });

  it('keeps only failed candidates after batch registration', () => {
    const candidates = [
      {
        localId: 'ok',
        sourceLabel: 'ok',
        imageUrl: '',
        imagePath: '',
        detectionId: null,
        candidate: analysisResult.candidates[0],
        values: emptyInventoryItemFormValues,
        selected: true,
        status: 'ready' as const,
        error: null,
      },
      {
        localId: 'ng',
        sourceLabel: 'ng',
        imageUrl: '',
        imagePath: '',
        detectionId: null,
        candidate: analysisResult.candidates[0],
        values: emptyInventoryItemFormValues,
        selected: true,
        status: 'ready' as const,
        error: null,
      },
    ];

    const remaining = applyCandidateRegistrationResults(candidates, [
      { localId: 'ok', ok: true, error: null },
      { localId: 'ng', ok: false, error: 'RLS denied' },
    ]);

    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({
      localId: 'ng',
      status: 'error',
      error: 'RLS denied',
    });
    expect(
      summarizeRegistrationResults([
        { localId: 'ok', ok: true, error: null },
        { localId: 'ng', ok: false, error: 'RLS denied' },
      ]),
    ).toEqual({ successCount: 1, failureCount: 1 });
  });
});
