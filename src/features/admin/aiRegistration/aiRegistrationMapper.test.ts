import { describe, expect, it } from 'vitest';
import { emptyInventoryItemFormValues } from '../inventoryForm';
import { applyAiCandidateToFormValues } from './aiRegistrationMapper';
import type { AiInventoryCandidate } from './types';

const candidate: AiInventoryCandidate = {
  candidate_id: 'candidate-1',
  name: 'ボンベイ・サファイア',
  item_type: 'alcohol',
  category: 'ジン',
  sub_category: 'ドライジン',
  alcohol_percentage: 47,
  volume_ml: 750,
  remaining_ml: 750,
  memo: '画像解析によるAI候補。保存前に確認してください。',
  confidence: 0.86,
  needs_review: true,
  needs_review_reasons: ['容量表記が不確実'],
  evidence: {
    visible_text: ['BOMBAY SAPPHIRE', '47%', '750ml'],
    visual_cues: [],
    inferred_fields: ['category', 'sub_category'],
    uncertainty_notes: [],
  },
};

describe('applyAiCandidateToFormValues', () => {
  it('maps an AI candidate into inventory form values', () => {
    const values = applyAiCandidateToFormValues(
      {
        ...emptyInventoryItemFormValues,
        image_url: 'https://example.com/image.jpg',
        display_order: '3',
      },
      candidate,
    );

    expect(values).toMatchObject({
      name: 'ボンベイ・サファイア',
      item_type: 'alcohol',
      category: 'ジン',
      sub_category: 'ドライジン',
      alcohol_percentage: '47',
      volume_ml: '750',
      remaining_ml: '750',
      image_url: 'https://example.com/image.jpg',
      memo: '画像解析によるAI候補。保存前に確認してください。',
      display_order: '3',
    });
  });

  it('uses volume_ml as remaining_ml fallback', () => {
    const values = applyAiCandidateToFormValues(emptyInventoryItemFormValues, {
      ...candidate,
      remaining_ml: null,
      volume_ml: 500,
    });

    expect(values.remaining_ml).toBe('500');
  });

  it('maps a Gemini Vision candidate without directly saving anything', () => {
    const values = applyAiCandidateToFormValues(emptyInventoryItemFormValues, {
      ...candidate,
      name: '三岳',
      category: '焼酎',
      sub_category: '芋焼酎',
      volume_ml: 900,
      remaining_ml: 900,
      memo: '画像解析によるAI候補。保存前に確認してください。',
      evidence: {
        visible_text: ['三岳', '本格焼酎', '900ml'],
        visual_cues: ['焼酎ボトルのラベル'],
        inferred_fields: ['category', 'sub_category'],
        uncertainty_notes: [],
      },
    });

    expect(values).toMatchObject({
      name: '三岳',
      category: '焼酎',
      sub_category: '芋焼酎',
      volume_ml: '900',
      remaining_ml: '900',
      memo: '画像解析によるAI候補。保存前に確認してください。',
    });
  });
});
