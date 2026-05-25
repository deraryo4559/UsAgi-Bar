import { describe, expect, it } from 'vitest';
import {
  createDetectionDrafts,
  createInitialBatchItems,
  getAcceptedDetectionDrafts,
  setDetectionAccepted,
  updateBatchAnalysisItem,
  updateDetectionDraftBox,
} from './multiItemDetectionState';
import type { InventoryDetection } from './types';

const detections: InventoryDetection[] = [
  {
    detection_id: 'det-1',
    label: 'ジンのボトル',
    item_kind: 'alcohol',
    box_2d: { xmin: 100, ymin: 120, xmax: 300, ymax: 900 },
    confidence: 0.88,
    needs_review: true,
    notes: null,
  },
  {
    detection_id: 'det-2',
    label: 'トニックウォーター',
    item_kind: 'mixer',
    box_2d: { xmin: 400, ymin: 140, xmax: 560, ymax: 820 },
    confidence: 0.78,
    needs_review: true,
    notes: null,
  },
];

describe('multiItemDetectionState', () => {
  it('creates accepted drafts from detections', () => {
    const drafts = createDetectionDrafts(detections);

    expect(drafts).toHaveLength(2);
    expect(drafts.every((draft) => draft.accepted)).toBe(true);
  });

  it('toggles accepted state', () => {
    const drafts = setDetectionAccepted(
      createDetectionDrafts(detections),
      'det-2',
      false,
    );

    expect(getAcceptedDetectionDrafts(drafts).map((draft) => draft.detection_id))
      .toEqual(['det-1']);
  });

  it('updates and clamps a detection box', () => {
    const drafts = updateDetectionDraftBox(
      createDetectionDrafts(detections),
      'det-1',
      {
        xmin: -50,
        xmax: 1200,
      },
    );

    expect(drafts[0].box_2d.xmin).toBe(0);
    expect(drafts[0].box_2d.xmax).toBe(1000);
  });

  it('creates batch items and maps crop analysis back to detection id', () => {
    const initial = createInitialBatchItems(createDetectionDrafts(detections));
    const updated = updateBatchAnalysisItem(initial, 'det-1', {
      cropPath: 'inventory/crops/2026-05-24/det-1.png',
      status: 'uploaded',
    });

    expect(updated[0]).toMatchObject({
      detectionId: 'det-1',
      cropPath: 'inventory/crops/2026-05-24/det-1.png',
      status: 'uploaded',
    });
    expect(updated[1].cropPath).toBeNull();
  });
});
