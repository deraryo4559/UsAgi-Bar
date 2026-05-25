import type { InventoryItemType } from '../../../types/inventory';

export const AI_INVENTORY_IMAGE_SCHEMA_VERSION =
  'ai_inventory_image_registration.v1';
export const INVENTORY_OBJECT_DETECTION_SCHEMA_VERSION =
  'inventory_object_detection.v1';

export type AiInventoryImageSource = {
  kind: 'gemini_vision';
  image_path: string;
};

export type AiInventorySource = AiInventoryImageSource;

export type AiImageAssessment = {
  single_item_likely: boolean;
  multiple_items_likely: boolean;
  label_readable: boolean;
  needs_review: boolean;
  notes: string | null;
};

export type AiInventoryCandidate = {
  candidate_id: string;
  name: string | null;
  item_type: InventoryItemType | null;
  category: string | null;
  sub_category: string | null;
  alcohol_percentage: number | null;
  volume_ml: number | null;
  remaining_ml: number | null;
  memo: string | null;
  thumbnail_prompt?: string | null;
  confidence: number;
  needs_review: boolean;
  needs_review_reasons: string[];
  evidence: {
    visible_text: string[];
    visual_cues: string[];
    inferred_fields: string[];
    uncertainty_notes: string[];
  };
};

export type AiInventoryImageAnalysisResult = {
  schema_version: typeof AI_INVENTORY_IMAGE_SCHEMA_VERSION;
  source: AiInventoryImageSource;
  image_assessment: AiImageAssessment;
  candidates: AiInventoryCandidate[];
  usage?: AiInventoryUsageMetadata | null;
};

export type AiInventoryUsageMetadata = {
  promptTokenCount: number | null;
  candidatesTokenCount: number | null;
  totalTokenCount: number | null;
};

export type AiInventoryAnalysisResult = AiInventoryImageAnalysisResult;

export type AnalyzeInventoryImageInput = {
  bucket: string;
  path: string;
};

export type DetectionItemKind = 'alcohol' | 'drink' | 'mixer' | 'unknown';

export type DetectionBox2d = {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
};

export type InventoryDetection = {
  detection_id: string;
  label: string;
  item_kind: DetectionItemKind;
  box_2d: DetectionBox2d;
  confidence: number;
  needs_review: boolean;
  notes: string | null;
};

export type InventoryObjectDetectionResult = {
  schema_version: typeof INVENTORY_OBJECT_DETECTION_SCHEMA_VERSION;
  source: {
    bucket: string;
    path: string;
  };
  detections: InventoryDetection[];
  warnings?: string[];
};

export type DetectInventoryItemsInput = {
  bucket: string;
  path: string;
};

export type GenerateInventoryThumbnailInput = {
  source: {
    bucket: string;
    path: string;
  };
  prompt: string;
  candidateId?: string | null;
};

export type GeneratedInventoryThumbnail = {
  url: string;
  path: string;
  provider: 'cloudflare-workers-ai';
  prompt: string;
};

export type GenerateInventoryThumbnailResult = {
  thumbnail: GeneratedInventoryThumbnail;
};
