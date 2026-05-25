import { inventoryItemTypes } from '../../inventory/api/inventoryItems';
import { INVENTORY_IMAGES_BUCKET } from '../../../lib/supabase/config';
import type { InventoryItemType } from '../../../types/inventory';
import {
  AI_INVENTORY_IMAGE_SCHEMA_VERSION,
  INVENTORY_OBJECT_DETECTION_SCHEMA_VERSION,
  type AiImageAssessment,
  type AiInventoryAnalysisResult,
  type AiInventoryCandidate,
  type AiInventoryUsageMetadata,
  type AiInventorySource,
  type AnalyzeInventoryImageInput,
  type DetectInventoryItemsInput,
  type DetectionItemKind,
  type GenerateInventoryThumbnailInput,
  type GenerateInventoryThumbnailResult,
  type InventoryDetection,
  type InventoryObjectDetectionResult,
} from './types';
import { normalizeBox } from './boundingBoxes';

export const MAX_STORAGE_PATH_LENGTH = 512;
export const MAX_THUMBNAIL_PROMPT_LENGTH = 1200;

export class AiRegistrationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiRegistrationValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function isNullableNumber(value: unknown): value is number | null {
  return (typeof value === 'number' && Number.isFinite(value)) || value === null;
}

function stringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function validateNumberRange(value: unknown, fallback: number, min = 0, max = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function validateSource(value: unknown): AiInventorySource {
  if (!isRecord(value)) {
    throw new AiRegistrationValidationError(
      'AI応答のsource形式が正しくありません。',
    );
  }

  if (value.kind === 'gemini_vision') {
    if (typeof value.image_path !== 'string' || !value.image_path.trim()) {
      throw new AiRegistrationValidationError(
        'AI応答のsource.image_pathが正しくありません。',
      );
    }

    return {
      kind: 'gemini_vision',
      image_path: value.image_path,
    };
  }

  throw new AiRegistrationValidationError(
    'AI応答のsource.kindが正しくありません。',
  );
}

function validateImageAssessment(value: unknown): AiImageAssessment {
  if (!isRecord(value)) {
    throw new AiRegistrationValidationError(
      'AI応答のimage_assessment形式が正しくありません。',
    );
  }

  return {
    single_item_likely: value.single_item_likely === true,
    multiple_items_likely: value.multiple_items_likely === true,
    label_readable: value.label_readable === true,
    needs_review:
      typeof value.needs_review === 'boolean' ? value.needs_review : true,
    notes: typeof value.notes === 'string' ? value.notes : null,
  };
}

function validateUsageMetadata(value: unknown): AiInventoryUsageMetadata | null {
  if (!isRecord(value)) {
    return null;
  }

  const usage = value;

  function tokenCount(key: string) {
    const count = usage[key];
    return typeof count === 'number' && Number.isFinite(count) ? count : null;
  }

  return {
    promptTokenCount: tokenCount('promptTokenCount'),
    candidatesTokenCount: tokenCount('candidatesTokenCount'),
    totalTokenCount: tokenCount('totalTokenCount'),
  };
}

export function validateAnalyzeInventoryImageInput(
  input: AnalyzeInventoryImageInput,
): AnalyzeInventoryImageInput {
  const bucket = input.bucket.trim();
  const path = input.path.trim();

  if (bucket !== INVENTORY_IMAGES_BUCKET) {
    throw new AiRegistrationValidationError(
      `画像解析に使えるStorage bucketは ${INVENTORY_IMAGES_BUCKET} のみです。`,
    );
  }

  if (!path) {
    throw new AiRegistrationValidationError('Storage pathを指定してください。');
  }

  if (
    path.length > MAX_STORAGE_PATH_LENGTH ||
    path.startsWith('/') ||
    path.includes('..') ||
    path.includes('\\')
  ) {
    throw new AiRegistrationValidationError('Storage pathの形式が正しくありません。');
  }

  if (!path.startsWith('inventory/')) {
    throw new AiRegistrationValidationError(
      '画像解析に使えるStorage pathは inventory/ 配下のみです。',
    );
  }

  return { bucket, path };
}

export function validateDetectInventoryItemsInput(
  input: DetectInventoryItemsInput,
): DetectInventoryItemsInput {
  return validateAnalyzeInventoryImageInput(input);
}

export function validateGenerateInventoryThumbnailInput(
  input: GenerateInventoryThumbnailInput,
): GenerateInventoryThumbnailInput {
  const source = validateAnalyzeInventoryImageInput(input.source);
  const prompt = input.prompt.trim();

  if (!prompt) {
    throw new AiRegistrationValidationError(
      'サムネイル生成promptを入力してください。',
    );
  }

  if (prompt.length > MAX_THUMBNAIL_PROMPT_LENGTH) {
    throw new AiRegistrationValidationError(
      `サムネイル生成promptは${MAX_THUMBNAIL_PROMPT_LENGTH}文字以内にしてください。`,
    );
  }

  const candidateId =
    typeof input.candidateId === 'string' && input.candidateId.trim()
      ? input.candidateId.trim()
      : null;

  return {
    source,
    prompt,
    candidateId,
  };
}

function validateCandidate(value: unknown, index: number): AiInventoryCandidate {
  if (!isRecord(value)) {
    throw new AiRegistrationValidationError(
      `AI候補${index + 1}件目の形式が正しくありません。`,
    );
  }

  if (
    !isNullableString(value.name) ||
    !isNullableString(value.category) ||
    !isNullableString(value.sub_category) ||
    !isNullableNumber(value.alcohol_percentage) ||
    !isNullableNumber(value.volume_ml) ||
    !isNullableNumber(value.remaining_ml) ||
    !isNullableString(value.memo)
  ) {
    throw new AiRegistrationValidationError(
      `AI候補${index + 1}件目の項目形式が正しくありません。`,
    );
  }

  const itemType = value.item_type;

  if (
    itemType !== null &&
    !inventoryItemTypes.includes(itemType as InventoryItemType)
  ) {
    throw new AiRegistrationValidationError(
      `AI候補${index + 1}件目のitem_typeが正しくありません。`,
    );
  }

  const evidence = isRecord(value.evidence) ? value.evidence : {};

  return {
    candidate_id:
      typeof value.candidate_id === 'string' && value.candidate_id.trim()
        ? value.candidate_id
        : `candidate-${index + 1}`,
    name: value.name,
    item_type: itemType as AiInventoryCandidate['item_type'],
    category: value.category,
    sub_category: value.sub_category,
    alcohol_percentage: value.alcohol_percentage,
    volume_ml: value.volume_ml,
    remaining_ml: value.remaining_ml,
    memo: value.memo,
    thumbnail_prompt:
      typeof value.thumbnail_prompt === 'string' && value.thumbnail_prompt.trim()
        ? value.thumbnail_prompt.trim()
        : null,
    confidence: validateNumberRange(value.confidence, 0),
    needs_review:
      typeof value.needs_review === 'boolean' ? value.needs_review : true,
    needs_review_reasons: stringArray(value.needs_review_reasons),
    evidence: {
      visible_text: stringArray(evidence.visible_text),
      visual_cues: stringArray(evidence.visual_cues),
      inferred_fields: stringArray(evidence.inferred_fields),
      uncertainty_notes: stringArray(evidence.uncertainty_notes),
    },
  };
}

export function validateGenerateInventoryThumbnailResult(
  value: unknown,
): GenerateInventoryThumbnailResult {
  if (!isRecord(value) || !isRecord(value.thumbnail)) {
    throw new AiRegistrationValidationError(
      'サムネイル生成応答の形式が正しくありません。',
    );
  }

  const thumbnail = value.thumbnail;

  if (
    typeof thumbnail.url !== 'string' ||
    !thumbnail.url.trim() ||
    typeof thumbnail.path !== 'string' ||
    !thumbnail.path.trim() ||
    thumbnail.provider !== 'cloudflare-workers-ai' ||
    typeof thumbnail.prompt !== 'string' ||
    !thumbnail.prompt.trim()
  ) {
    throw new AiRegistrationValidationError(
      'サムネイル生成応答のthumbnail形式が正しくありません。',
    );
  }

  return {
    thumbnail: {
      url: thumbnail.url.trim(),
      path: thumbnail.path.trim(),
      provider: 'cloudflare-workers-ai',
      prompt: thumbnail.prompt.trim(),
    },
  };
}

export function validateAiInventoryAnalysisResult(
  value: unknown,
): AiInventoryAnalysisResult {
  if (!isRecord(value)) {
    throw new AiRegistrationValidationError(
      'Gemini応答がJSONオブジェクトではありません。',
    );
  }

  if (value.schema_version !== AI_INVENTORY_IMAGE_SCHEMA_VERSION) {
    throw new AiRegistrationValidationError(
      'Gemini応答のschema_versionが正しくありません。',
    );
  }

  if (!Array.isArray(value.candidates) || value.candidates.length === 0) {
    throw new AiRegistrationValidationError(
      'Gemini応答に登録候補が含まれていません。',
    );
  }

  const source = validateSource(value.source);
  const candidates = value.candidates.map(validateCandidate);

  if (source.kind !== 'gemini_vision') {
    throw new AiRegistrationValidationError(
      'Gemini Vision応答のsource.kindが正しくありません。',
    );
  }

  return {
    schema_version: AI_INVENTORY_IMAGE_SCHEMA_VERSION,
    source,
    image_assessment: validateImageAssessment(value.image_assessment),
    candidates,
    usage: validateUsageMetadata(value.usage),
  };
}

const detectionItemKinds: DetectionItemKind[] = [
  'alcohol',
  'drink',
  'mixer',
  'unknown',
];

function validateDetection(value: unknown, index: number): InventoryDetection {
  if (!isRecord(value)) {
    throw new AiRegistrationValidationError(
      `検出候補${index + 1}件目の形式が正しくありません。`,
    );
  }

  if (
    typeof value.item_kind !== 'string' ||
    !detectionItemKinds.includes(value.item_kind as DetectionItemKind)
  ) {
    throw new AiRegistrationValidationError(
      `検出候補${index + 1}件目のitem_kindが正しくありません。`,
    );
  }

  if (!isRecord(value.box_2d)) {
    throw new AiRegistrationValidationError(
      `検出候補${index + 1}件目のbox_2dが正しくありません。`,
    );
  }

  return {
    detection_id:
      typeof value.detection_id === 'string' && value.detection_id.trim()
        ? value.detection_id
        : `det-${index + 1}`,
    label:
      typeof value.label === 'string' && value.label.trim()
        ? value.label
        : `検出候補 ${index + 1}`,
    item_kind: value.item_kind as DetectionItemKind,
    box_2d: normalizeBox({
      ymin: Number(value.box_2d.ymin),
      xmin: Number(value.box_2d.xmin),
      ymax: Number(value.box_2d.ymax),
      xmax: Number(value.box_2d.xmax),
    }),
    confidence: validateNumberRange(value.confidence, 0),
    needs_review:
      typeof value.needs_review === 'boolean' ? value.needs_review : true,
    notes: typeof value.notes === 'string' ? value.notes : null,
  };
}

export function validateInventoryObjectDetectionResult(
  value: unknown,
): InventoryObjectDetectionResult {
  if (!isRecord(value)) {
    throw new AiRegistrationValidationError(
      '検出応答がJSONオブジェクトではありません。',
    );
  }

  if (value.schema_version !== INVENTORY_OBJECT_DETECTION_SCHEMA_VERSION) {
    throw new AiRegistrationValidationError(
      '検出応答のschema_versionが正しくありません。',
    );
  }

  if (!isRecord(value.source)) {
    throw new AiRegistrationValidationError('検出応答のsource形式が正しくありません。');
  }

  const source = {
    bucket:
      typeof value.source.bucket === 'string' ? value.source.bucket : '',
    path: typeof value.source.path === 'string' ? value.source.path : '',
  };

  validateDetectInventoryItemsInput(source);

  if (!Array.isArray(value.detections)) {
    throw new AiRegistrationValidationError(
      '検出応答のdetectionsが配列ではありません。',
    );
  }

  return {
    schema_version: INVENTORY_OBJECT_DETECTION_SCHEMA_VERSION,
    source,
    detections: value.detections.map(validateDetection),
    warnings: stringArray(value.warnings),
  };
}

export function getCandidateReviewReasons(
  candidate: AiInventoryCandidate,
  source?: AiInventorySource,
) {
  const reasons = new Set(candidate.needs_review_reasons);

  if (candidate.needs_review) {
    reasons.add('AIが確認必要と判断しています。');
  }

  if (!candidate.name) {
    reasons.add('商品名が空です。');
  }

  if (!candidate.item_type) {
    reasons.add('item_typeが空です。');
  }

  if (candidate.confidence < 0.75) {
    reasons.add('AI候補のconfidenceが低めです。');
  }

  if (source?.kind === 'gemini_vision') {
    reasons.add('Gemini Visionによる画像解析候補です。保存前に目視確認してください。');
  }

  if (
    candidate.item_type === 'alcohol' &&
    candidate.alcohol_percentage === null
  ) {
    reasons.add('酒類候補ですが度数が空です。');
  }

  return [...reasons];
}
