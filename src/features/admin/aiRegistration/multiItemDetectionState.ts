import type {
  AiInventoryAnalysisResult,
  DetectionBox2d,
  InventoryDetection,
} from './types';
import { clampBox, normalizeBox } from './boundingBoxes';

export type DetectionDraft = InventoryDetection & {
  accepted: boolean;
  box_2d: DetectionBox2d;
};

export type BatchAnalysisStatus =
  | 'cropping'
  | 'uploaded'
  | 'analyzing'
  | 'done'
  | 'error';

export type BatchAnalysisItem = {
  detectionId: string;
  label: string;
  cropPath: string | null;
  cropPublicUrl: string | null;
  status: BatchAnalysisStatus;
  result: AiInventoryAnalysisResult | null;
  error: string | null;
};

export function createDetectionDrafts(
  detections: InventoryDetection[],
): DetectionDraft[] {
  return detections.map((detection) => ({
    ...detection,
    accepted: true,
    box_2d: normalizeBox(detection.box_2d),
  }));
}

export function setDetectionAccepted(
  drafts: DetectionDraft[],
  detectionId: string,
  accepted: boolean,
) {
  return drafts.map((draft) =>
    draft.detection_id === detectionId ? { ...draft, accepted } : draft,
  );
}

export function updateDetectionDraftBox(
  drafts: DetectionDraft[],
  detectionId: string,
  patch: Partial<DetectionBox2d>,
) {
  return drafts.map((draft) =>
    draft.detection_id === detectionId
      ? {
          ...draft,
          box_2d: clampBox({
            ...draft.box_2d,
            ...patch,
          }),
        }
      : draft,
  );
}

export function getAcceptedDetectionDrafts(drafts: DetectionDraft[]) {
  return drafts.filter((draft) => draft.accepted).map((draft) => ({
    ...draft,
    box_2d: normalizeBox(draft.box_2d),
  }));
}

export function createInitialBatchItems(
  drafts: DetectionDraft[],
): BatchAnalysisItem[] {
  return drafts.map((draft) => ({
    detectionId: draft.detection_id,
    label: draft.label,
    cropPath: null,
    cropPublicUrl: null,
    status: 'cropping',
    result: null,
    error: null,
  }));
}

export function updateBatchAnalysisItem(
  items: BatchAnalysisItem[],
  detectionId: string,
  patch: Partial<BatchAnalysisItem>,
) {
  return items.map((item) =>
    item.detectionId === detectionId ? { ...item, ...patch } : item,
  );
}
