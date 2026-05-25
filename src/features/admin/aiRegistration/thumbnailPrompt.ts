import type { AiInventoryCandidate } from './types';

const DEFAULT_STYLE =
  'cozy night bar app style, clean cute 2D/3D hybrid illustration, full container visible, upright, centered object, large in frame, natural bottle or can proportions, not stretched sideways, crisp silhouette, simplified label blocks, soft highlight, transparent background';

function cleanText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ') ?? '';
}

function objectDescription(candidate: AiInventoryCandidate) {
  const category = cleanText(candidate.category);
  const subCategory = cleanText(candidate.sub_category);
  const type = candidate.item_type ?? 'drink';
  const cues = candidate.evidence.visual_cues
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 3);

  if (category || subCategory) {
    return [subCategory, category, type].filter(Boolean).join(', ');
  }

  if (cues.length > 0) {
    return cues.join(', ');
  }

  return `${type} bottle or drink package`;
}

export function buildInventoryThumbnailPrompt(candidate: AiInventoryCandidate) {
  const visibleColors = candidate.evidence.visual_cues
    .map(cleanText)
    .filter((cue) => /色|label|bottle|can|paper|glass|green|blue|red|white|black|gold/i.test(cue))
    .slice(0, 3);

  const details = [
    objectDescription(candidate),
    ...visibleColors,
    DEFAULT_STYLE,
    'plain pure white or transparent background for clean cutout',
    'no readable text',
    'no exact brand logo',
    'no watermark',
    'not a photo',
    'not a shelf scene',
    'not a wide flattened object',
    'ignore cropped neighboring objects',
    'clean thumbnail',
  ].filter(Boolean);

  return `A ${details.join(', ')}.`;
}

export function resolveInventoryThumbnailPrompt(candidate: AiInventoryCandidate) {
  const prompt = cleanText(candidate.thumbnail_prompt);
  return prompt || buildInventoryThumbnailPrompt(candidate);
}
