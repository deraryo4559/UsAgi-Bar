import { describe, expect, it } from 'vitest';
import {
  getCandidateReviewReasons,
  validateAiInventoryAnalysisResult,
  validateAnalyzeInventoryImageInput,
  validateGenerateInventoryThumbnailInput,
  validateGenerateInventoryThumbnailResult,
  validateInventoryObjectDetectionResult,
} from './aiRegistrationValidation';
import type { AiInventoryAnalysisResult } from './types';

const validResult: AiInventoryAnalysisResult = {
  schema_version: 'ai_inventory_image_registration.v1',
  source: {
    kind: 'gemini_vision',
    image_path: 'inventory/2026-05-23/bombay.jpg',
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
      name: 'ボンベイ・サファイア',
      item_type: 'alcohol',
      category: 'ジン',
      sub_category: 'ドライジン',
      alcohol_percentage: 47,
      volume_ml: 750,
      remaining_ml: 750,
      memo: '画像解析によるAI候補。保存前に確認してください。',
      thumbnail_prompt: null,
      confidence: 0.86,
      needs_review: true,
      needs_review_reasons: ['容量表記が不確実'],
      evidence: {
        visible_text: ['BOMBAY SAPPHIRE', '47%', '750ml'],
        visual_cues: [],
        inferred_fields: ['category', 'sub_category'],
        uncertainty_notes: [],
      },
    },
  ],
};

describe('AI registration validation', () => {
  it('validates Gemini Vision JSON schema', () => {
    expect(validateAiInventoryAnalysisResult(validResult)).toEqual({
      ...validResult,
      usage: null,
    });
  });

  it('keeps safe Gemini usage metadata', () => {
    const result = validateAiInventoryAnalysisResult({
      ...validResult,
      usage: {
        promptTokenCount: 1200,
        candidatesTokenCount: 180,
        totalTokenCount: 1380,
      },
    });

    expect(result.usage).toEqual({
      promptTokenCount: 1200,
      candidatesTokenCount: 180,
      totalTokenCount: 1380,
    });
  });

  it('validates Gemini Vision JSON schema with image assessment', () => {
    const result = validateAiInventoryAnalysisResult({
      schema_version: 'ai_inventory_image_registration.v1',
      source: {
        kind: 'gemini_vision',
        image_path: 'inventory/2026-05-23/mitake.jpg',
      },
      image_assessment: {
        single_item_likely: true,
        multiple_items_likely: false,
        label_readable: true,
        needs_review: true,
        notes: '日本語ラベルが見えます。',
      },
      candidates: [
        {
          ...validResult.candidates[0],
          name: '三岳',
          category: '焼酎',
          sub_category: '芋焼酎',
          volume_ml: 900,
          remaining_ml: 900,
          evidence: {
            visible_text: ['三岳', '本格焼酎', '900ml'],
            visual_cues: ['焼酎ボトルのラベル'],
            inferred_fields: ['category', 'sub_category'],
            uncertainty_notes: [],
          },
        },
      ],
    });

    expect(result.schema_version).toBe('ai_inventory_image_registration.v1');
    expect(result.source.kind).toBe('gemini_vision');
  });

  it('throws when Gemini response shape is invalid', () => {
    expect(() =>
      validateAiInventoryAnalysisResult({
        schema_version: 'ai_inventory_image_registration.v1',
        source: validResult.source,
        image_assessment: validResult.image_assessment,
        candidates: [],
      }),
    ).toThrow('登録候補が含まれていません');
  });

  it('throws when item_type is not allowed', () => {
    expect(() =>
      validateAiInventoryAnalysisResult({
        ...validResult,
        candidates: [
          {
            ...validResult.candidates[0],
            item_type: 'food',
          },
        ],
      }),
    ).toThrow('item_type');
  });

  it('derives needs_review reasons from candidate and Gemini Vision source', () => {
    const reasons = getCandidateReviewReasons(
      {
        ...validResult.candidates[0],
        name: null,
        confidence: 0.5,
        alcohol_percentage: null,
      },
      validResult.source,
    );

    expect(reasons).toEqual(
      expect.arrayContaining([
        '商品名が空です。',
        'AI候補のconfidenceが低めです。',
        'Gemini Visionによる画像解析候補です。保存前に目視確認してください。',
        '酒類候補ですが度数が空です。',
      ]),
    );
  });

  it('validates Storage bucket and path for Gemini Vision', () => {
    expect(
      validateAnalyzeInventoryImageInput({
        bucket: 'inventory-images',
        path: 'inventory/2026-05-23/mitake.jpg',
      }),
    ).toEqual({
      bucket: 'inventory-images',
      path: 'inventory/2026-05-23/mitake.jpg',
    });

    expect(() =>
      validateAnalyzeInventoryImageInput({
        bucket: 'avatars',
        path: 'inventory/2026-05-23/mitake.jpg',
      }),
    ).toThrow('inventory-images');

    expect(() =>
      validateAnalyzeInventoryImageInput({
        bucket: 'inventory-images',
        path: '../secret.jpg',
      }),
    ).toThrow('Storage path');
  });

  it('validates inventory object detection results', () => {
    const result = validateInventoryObjectDetectionResult({
      schema_version: 'inventory_object_detection.v1',
      source: {
        bucket: 'inventory-images',
        path: 'inventory/2026-05-24/group.jpg',
      },
      detections: [
        {
          detection_id: 'det-1',
          label: 'ジンのボトル',
          item_kind: 'alcohol',
          box_2d: {
            ymin: 120,
            xmin: 310,
            ymax: 780,
            xmax: 520,
          },
          confidence: 0.82,
          needs_review: true,
          notes: '正面ラベルあり',
        },
      ],
    });

    expect(result.detections[0]).toMatchObject({
      detection_id: 'det-1',
      item_kind: 'alcohol',
      box_2d: {
        ymin: 120,
        xmin: 310,
        ymax: 780,
        xmax: 520,
      },
    });
  });

  it('keeps detection fallback warnings', () => {
    const result = validateInventoryObjectDetectionResult({
      schema_version: 'inventory_object_detection.v1',
      source: {
        bucket: 'inventory-images',
        path: 'inventory/2026-05-24/group.jpg',
      },
      detections: [],
      warnings: ['画像全体解析へフォールバックします。'],
    });

    expect(result.detections).toEqual([]);
    expect(result.warnings).toEqual(['画像全体解析へフォールバックします。']);
  });

  it('rejects invalid detection boxes', () => {
    expect(() =>
      validateInventoryObjectDetectionResult({
        schema_version: 'inventory_object_detection.v1',
        source: {
          bucket: 'inventory-images',
          path: 'inventory/2026-05-24/group.jpg',
        },
        detections: [
          {
            detection_id: 'det-1',
            label: '不正な枠',
            item_kind: 'alcohol',
            box_2d: {
              ymin: 900,
              xmin: 310,
              ymax: 120,
              xmax: 520,
            },
            confidence: 0.82,
            needs_review: true,
            notes: null,
          },
        ],
      }),
    ).toThrow('xmin < xmax');
  });

  it('validates thumbnail generation input', () => {
    expect(
      validateGenerateInventoryThumbnailInput({
        source: {
          bucket: 'inventory-images',
          path: 'inventory/crops/2026-05-25/candidate.png',
        },
        prompt: 'A clean illustrated thumbnail, no readable text.',
        candidateId: 'candidate-1',
      }),
    ).toEqual({
      source: {
        bucket: 'inventory-images',
        path: 'inventory/crops/2026-05-25/candidate.png',
      },
      prompt: 'A clean illustrated thumbnail, no readable text.',
      candidateId: 'candidate-1',
    });

    expect(() =>
      validateGenerateInventoryThumbnailInput({
        source: {
          bucket: 'inventory-images',
          path: 'inventory/crops/2026-05-25/candidate.png',
        },
        prompt: '',
      }),
    ).toThrow('prompt');
  });

  it('validates thumbnail generation response', () => {
    expect(
      validateGenerateInventoryThumbnailResult({
        thumbnail: {
          url: 'https://example.com/thumb.png',
          path: 'thumbnails/2026-05-25/thumb.png',
          provider: 'cloudflare-workers-ai',
          prompt: 'A clean illustrated thumbnail.',
        },
      }),
    ).toEqual({
      thumbnail: {
        url: 'https://example.com/thumb.png',
        path: 'thumbnails/2026-05-25/thumb.png',
        provider: 'cloudflare-workers-ai',
        prompt: 'A clean illustrated thumbnail.',
      },
    });

    expect(() =>
      validateGenerateInventoryThumbnailResult({
        thumbnail: {
          url: 'https://example.com/thumb.png',
          path: 'thumbnails/2026-05-25/thumb.png',
          provider: 'other-provider',
          prompt: 'A clean illustrated thumbnail.',
        },
      }),
    ).toThrow('thumbnail');
  });
});
