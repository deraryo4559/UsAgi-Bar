import { filterDetectionsByConfidence, validateLocalDetection } from './detectionValidation';
import {
  getTargetClassEntry,
  type LocalDetectionClassConfig,
} from './classConfig';
import type {
  ImageSize,
  LocalDetection,
  LocalDetectionBox,
} from './types';

export type RawYoloDetection = {
  labelIndex: number;
  confidence: number;
  box: LocalDetectionBox;
};

export type LocalDetectionPostprocessResult = {
  detections: LocalDetection[];
  confidenceThresholdCount: number;
  nmsDetectionsCount: number;
  excludedClassCount: number;
};

export function getIntersectionOverUnion(
  left: LocalDetectionBox,
  right: LocalDetectionBox,
) {
  const x1 = Math.max(left.xmin, right.xmin);
  const y1 = Math.max(left.ymin, right.ymin);
  const x2 = Math.min(left.xmax, right.xmax);
  const y2 = Math.min(left.ymax, right.ymax);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const leftArea = Math.max(0, left.xmax - left.xmin) * Math.max(0, left.ymax - left.ymin);
  const rightArea = Math.max(0, right.xmax - right.xmin) * Math.max(0, right.ymax - right.ymin);
  const union = leftArea + rightArea - intersection;

  return union > 0 ? intersection / union : 0;
}

export function nonMaxSuppression(
  detections: LocalDetection[],
  iouThreshold: number,
) {
  const sorted = [...detections].sort((left, right) => right.confidence - left.confidence);
  const selected: LocalDetection[] = [];

  for (const detection of sorted) {
    const overlapsSelected = selected.some(
      (current) =>
        getIntersectionOverUnion(current.box, detection.box) > iouThreshold,
    );

    if (!overlapsSelected) {
      selected.push(detection);
    }
  }

  return selected;
}

export function mapRawYoloDetections({
  rawDetections,
  imageSize,
  minConfidence,
  iouThreshold,
  maxDetections,
  classConfig,
}: {
  rawDetections: RawYoloDetection[];
  imageSize: ImageSize;
  minConfidence: number;
  iouThreshold: number;
  maxDetections: number;
  classConfig: LocalDetectionClassConfig;
}) {
  return postprocessRawYoloDetections({
    rawDetections,
    imageSize,
    minConfidence,
    iouThreshold,
    maxDetections,
    classConfig,
  }).detections;
}

export function postprocessRawYoloDetections({
  rawDetections,
  imageSize,
  minConfidence,
  iouThreshold,
  maxDetections,
  classConfig,
}: {
  rawDetections: RawYoloDetection[];
  imageSize: ImageSize;
  minConfidence: number;
  iouThreshold: number;
  maxDetections: number;
  classConfig: LocalDetectionClassConfig;
}): LocalDetectionPostprocessResult {
  let excludedClassCount = 0;
  const mapped = rawDetections
    .map((raw, index) => {
      const classEntry = getTargetClassEntry(classConfig, raw.labelIndex);

      if (!classEntry) {
        excludedClassCount += 1;
        return null;
      }

      return validateLocalDetection(
        {
          detectionId: `local-${index + 1}`,
          label: classEntry.name,
          kind: classEntry.kind,
          confidence: raw.confidence,
          box: raw.box,
          source: 'local_ml',
        },
        imageSize,
      );
    })
    .filter((detection): detection is LocalDetection => detection !== null);
  const thresholded = filterDetectionsByConfidence(mapped, minConfidence);
  const nmsDetections = nonMaxSuppression(thresholded, iouThreshold).slice(
    0,
    maxDetections,
  );

  return {
    detections: nmsDetections,
    confidenceThresholdCount: thresholded.length,
    nmsDetectionsCount: nmsDetections.length,
    excludedClassCount,
  };
}
