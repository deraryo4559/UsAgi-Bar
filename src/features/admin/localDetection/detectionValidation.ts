import type { ImageSize, LocalDetection, LocalDetectionBox } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function assertImageSize(imageSize: ImageSize) {
  if (
    !Number.isFinite(imageSize.width) ||
    !Number.isFinite(imageSize.height) ||
    imageSize.width <= 0 ||
    imageSize.height <= 0
  ) {
    throw new Error('画像サイズが正しくありません。');
  }
}

export function clampLocalDetectionBox(
  box: LocalDetectionBox,
  imageSize: ImageSize,
): LocalDetectionBox {
  assertImageSize(imageSize);

  return {
    xmin: clamp(box.xmin, 0, imageSize.width),
    ymin: clamp(box.ymin, 0, imageSize.height),
    xmax: clamp(box.xmax, 0, imageSize.width),
    ymax: clamp(box.ymax, 0, imageSize.height),
  };
}

export function normalizeLocalDetectionBox(
  box: LocalDetectionBox,
  imageSize: ImageSize,
) {
  const clamped = clampLocalDetectionBox(box, imageSize);

  if (
    !Number.isFinite(clamped.xmin) ||
    !Number.isFinite(clamped.ymin) ||
    !Number.isFinite(clamped.xmax) ||
    !Number.isFinite(clamped.ymax)
  ) {
    throw new Error('検出枠の座標が数値ではありません。');
  }

  if (clamped.xmin >= clamped.xmax || clamped.ymin >= clamped.ymax) {
    throw new Error('検出枠は xmin < xmax かつ ymin < ymax にしてください。');
  }

  return clamped;
}

export function validateLocalDetection(
  detection: LocalDetection,
  imageSize: ImageSize,
): LocalDetection {
  return {
    ...detection,
    confidence: Math.min(
      1,
      Math.max(0, Number.isFinite(detection.confidence) ? detection.confidence : 0),
    ),
    box: normalizeLocalDetectionBox(detection.box, imageSize),
  };
}

export function filterDetectionsByConfidence(
  detections: LocalDetection[],
  minConfidence: number,
) {
  return detections.filter(
    (detection) => detection.confidence >= minConfidence,
  );
}
