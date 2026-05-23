import { describe, expect, it } from 'vitest';
import { emptyInventoryItemFormValues } from '../inventoryForm';
import {
  checkCategoryMatch,
  normalizeAiCandidate,
  previewAiCandidateFormValues,
  type CategoryReferenceData,
} from './aiCandidateNormalization';
import type { AiInventoryCandidate } from './types';

const referenceData: CategoryReferenceData = {
  cocktailIngredients: [
    { ingredient_name: 'ジン' },
    { ingredient_name: 'トニックウォーター' },
  ],
  ingredientAliases: [
    { canonical_name: 'ジン', alias_name: 'gin' },
    { canonical_name: 'ジン', alias_name: 'SUNTORY SUI' },
    { canonical_name: 'ジン', alias_name: 'SUNTORY GIN SUI' },
    { canonical_name: 'ジン', alias_name: '翠' },
    { canonical_name: 'コーヒーリキュール', alias_name: 'カルーア' },
    { canonical_name: 'コーヒーリキュール', alias_name: 'Kahlúa' },
    { canonical_name: '焼酎', alias_name: '三岳' },
    { canonical_name: '日本酒', alias_name: '浦霞' },
    { canonical_name: 'ウイスキー', alias_name: '角瓶' },
    { canonical_name: 'ビール', alias_name: 'beer' },
  ],
};

const candidateBase: AiInventoryCandidate = {
  candidate_id: 'candidate-1',
  name: '三岳',
  item_type: 'alcohol',
  category: '焼酎',
  sub_category: null,
  alcohol_percentage: null,
  volume_ml: 900,
  remaining_ml: null,
  memo: null,
  confidence: 1.2,
  needs_review: true,
  needs_review_reasons: [],
  evidence: {
    visible_text: ['三岳', 'みたけ', '本格焼酎', '900ml'],
    visual_cues: [],
    inferred_fields: [],
    uncertainty_notes: [],
  },
};

describe('AI candidate normalization', () => {
  it('fills remaining_ml from volume_ml', () => {
    const normalized = normalizeAiCandidate({
      candidate: candidateBase,
      currentValues: emptyInventoryItemFormValues,
      referenceData,
    });

    expect(normalized.candidate.remaining_ml).toBe(900);
    expect(normalized.autoFilledFields).toContain('remaining_ml');
  });

  it('warns when alcohol percentage is unknown for alcohol', () => {
    const normalized = normalizeAiCandidate({
      candidate: candidateBase,
      currentValues: emptyInventoryItemFormValues,
      referenceData,
    });

    expect(normalized.warnings.map((warning) => warning.code)).toContain(
      'missing_alcohol_percentage',
    );
  });

  it('warns when category is not registered in cocktail ingredients or aliases', () => {
    const match = checkCategoryMatch('未登録カテゴリ', referenceData);

    expect(match.status).toBe('unmatched');
  });

  it('does not warn when category is registered in cocktail ingredients', () => {
    const match = checkCategoryMatch('ジン', referenceData);

    expect(match.status).toBe('matched');
  });

  it('does not warn when category is registered in aliases', () => {
    const match = checkCategoryMatch('カルーア', referenceData);

    expect(match.status).toBe('matched');
  });

  it('normalizes SUNTORY SUI category to gin', () => {
    const normalized = normalizeAiCandidate({
      candidate: {
        ...candidateBase,
        name: 'SUNTORY SUI',
        category: 'SUI',
        sub_category: null,
        evidence: {
          ...candidateBase.evidence,
          visible_text: ['SUNTORY SUI', '翠', 'ジャパニーズジン'],
        },
      },
      currentValues: emptyInventoryItemFormValues,
      referenceData,
    });

    expect(normalized.candidate.category).toBe('ジン');
    expect(normalized.warnings.map((warning) => warning.code)).toContain(
      'category_alias_normalized',
    );
  });

  it('normalizes 翠 category to gin by alias', () => {
    const normalized = normalizeAiCandidate({
      candidate: {
        ...candidateBase,
        name: '翠',
        category: '翠',
        evidence: {
          ...candidateBase.evidence,
          visible_text: ['翠', 'SUNTORY'],
        },
      },
      currentValues: emptyInventoryItemFormValues,
      referenceData,
    });

    expect(normalized.candidate.category).toBe('ジン');
    expect(normalized.warnings.map((warning) => warning.code)).toContain(
      'category_alias_normalized',
    );
  });

  it('normalizes SUNTORY GIN SUI category to gin by alias', () => {
    const normalized = normalizeAiCandidate({
      candidate: {
        ...candidateBase,
        name: 'SUNTORY GIN SUI',
        category: 'SUNTORY GIN SUI',
        evidence: {
          ...candidateBase.evidence,
          visible_text: ['SUNTORY', 'GIN', 'SUI'],
        },
      },
      currentValues: emptyInventoryItemFormValues,
      referenceData,
    });

    expect(normalized.candidate.category).toBe('ジン');
    expect(normalized.warnings.map((warning) => warning.code)).toContain(
      'category_alias_normalized',
    );
  });

  it('normalizes Kahlua category to coffee liqueur', () => {
    const normalized = normalizeAiCandidate({
      candidate: {
        ...candidateBase,
        name: 'カルーア',
        category: 'カルーア',
        volume_ml: 700,
        evidence: {
          ...candidateBase.evidence,
          visible_text: ['KAHLUA', 'カルーア'],
        },
      },
      currentValues: emptyInventoryItemFormValues,
      referenceData,
    });

    expect(normalized.candidate.category).toBe('コーヒーリキュール');
  });

  it('normalizes Kahlúa category to coffee liqueur by alias', () => {
    const normalized = normalizeAiCandidate({
      candidate: {
        ...candidateBase,
        name: 'Kahlúa',
        category: 'Kahlúa',
        volume_ml: 700,
        evidence: {
          ...candidateBase.evidence,
          visible_text: ['Kahlúa'],
        },
      },
      currentValues: emptyInventoryItemFormValues,
      referenceData,
    });

    expect(normalized.candidate.category).toBe('コーヒーリキュール');
  });

  it('normalizes Mitake category to shochu', () => {
    const normalized = normalizeAiCandidate({
      candidate: {
        ...candidateBase,
        category: null,
      },
      currentValues: emptyInventoryItemFormValues,
      referenceData,
    });

    expect(normalized.candidate.category).toBe('焼酎');
  });

  it('normalizes Urakasumi category to sake by alias', () => {
    const normalized = normalizeAiCandidate({
      candidate: {
        ...candidateBase,
        name: '浦霞',
        category: '浦霞',
        evidence: {
          ...candidateBase.evidence,
          visible_text: ['浦霞'],
        },
      },
      currentValues: emptyInventoryItemFormValues,
      referenceData,
    });

    expect(normalized.candidate.category).toBe('日本酒');
  });

  it('normalizes Kakubin category to whisky by alias', () => {
    const normalized = normalizeAiCandidate({
      candidate: {
        ...candidateBase,
        name: '角瓶',
        category: '角瓶',
        evidence: {
          ...candidateBase.evidence,
          visible_text: ['角瓶'],
        },
      },
      currentValues: emptyInventoryItemFormValues,
      referenceData,
    });

    expect(normalized.candidate.category).toBe('ウイスキー');
  });

  it('normalizes beer category to ビール by alias', () => {
    const normalized = normalizeAiCandidate({
      candidate: {
        ...candidateBase,
        name: 'beer',
        category: 'beer',
        evidence: {
          ...candidateBase.evidence,
          visible_text: ['beer'],
        },
      },
      currentValues: emptyInventoryItemFormValues,
      referenceData,
    });

    expect(normalized.candidate.category).toBe('ビール');
  });

  it('previews form conversion without overwriting existing manual values', () => {
    const preview = previewAiCandidateFormValues({
      currentValues: {
        ...emptyInventoryItemFormValues,
        name: '手入力名',
        memo: '手入力メモ',
      },
      candidate: {
        ...candidateBase,
        remaining_ml: 900,
        memo: '画像解析候補。保存前に確認してください。',
      },
    });

    expect(preview.values.name).toBe('手入力名');
    expect(preview.values.remaining_ml).toBe('900');
    expect(preview.values.memo).toContain('手入力メモ');
    expect(preview.values.memo).toContain('画像解析候補');
    expect(preview.overwrittenFields).toContain('name');
  });
});
