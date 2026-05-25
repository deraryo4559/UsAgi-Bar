import { describe, expect, it } from 'vitest';
import type { AiInventoryCandidate } from './types';
import {
  buildInventoryThumbnailPrompt,
  resolveInventoryThumbnailPrompt,
} from './thumbnailPrompt';

const candidate: AiInventoryCandidate = {
  candidate_id: 'candidate-1',
  name: 'SUNTORY SUI',
  item_type: 'alcohol',
  category: 'ジン',
  sub_category: null,
  alcohol_percentage: null,
  volume_ml: 700,
  remaining_ml: 700,
  memo: null,
  confidence: 0.8,
  needs_review: true,
  needs_review_reasons: [],
  evidence: {
    visible_text: ['SUNTORY SUI'],
    visual_cues: ['green bottle', 'white label'],
    inferred_fields: [],
    uncertainty_notes: [],
  },
};

describe('thumbnail prompt helpers', () => {
  it('builds a safe thumbnail prompt without asking for exact text or logos', () => {
    const prompt = buildInventoryThumbnailPrompt(candidate);

    expect(prompt).toContain('ジン');
    expect(prompt).toContain('night bar');
    expect(prompt).toContain('no readable text');
    expect(prompt).toContain('no exact brand logo');
    expect(prompt).toContain('natural bottle or can proportions');
    expect(prompt).toContain('not stretched sideways');
  });

  it('uses Gemini-provided prompt when present', () => {
    expect(
      resolveInventoryThumbnailPrompt({
        ...candidate,
        thumbnail_prompt: 'A custom safe prompt.',
      }),
    ).toBe('A custom safe prompt.');
  });
});
