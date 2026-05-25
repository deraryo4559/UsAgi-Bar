import type { LocalDetectionResult } from './types';
import {
  DEFAULT_LOCAL_DETECTION_MODEL_PATH,
  LocalDetectionModelError,
  YoloLocalObjectDetector,
} from './yoloDetector';

let detector: YoloLocalObjectDetector | null = null;

export function createLocalDetectionFallbackResult({
  message,
  modelPath,
}: {
  message: string;
  modelPath: string;
}): LocalDetectionResult {
  return {
    detections: [],
    warnings: [message],
    modelPath,
    imageSize: null,
    debug: null,
  };
}

export async function detectLocalInventoryItems({
  imageUrl,
  modelPath = DEFAULT_LOCAL_DETECTION_MODEL_PATH,
}: {
  imageUrl: string;
  modelPath?: string;
}): Promise<LocalDetectionResult> {
  detector ??= new YoloLocalObjectDetector(modelPath);

  try {
    return await detector.detect(imageUrl);
  } catch (error) {
    if (error instanceof LocalDetectionModelError) {
      return createLocalDetectionFallbackResult({
        message: `${error.message} 端末内の切り抜き補助は使わず、画像全体解析で候補を作成しました。`,
        modelPath,
      });
    }

    return createLocalDetectionFallbackResult({
      message:
        '端末内の切り抜き補助を完了できなかったため、画像全体解析で候補を作成しました。',
      modelPath,
    });
  }
}
