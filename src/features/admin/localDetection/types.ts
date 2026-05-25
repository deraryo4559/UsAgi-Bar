export type LocalDetectionKind =
  | 'bottle'
  | 'can'
  | 'carton'
  | 'cup'
  | 'wine_glass'
  | 'plastic_bottle'
  | 'drink_pack'
  | 'unknown';

export type LocalDetectionBox = {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
};

export type LocalDetection = {
  detectionId: string;
  label: string;
  kind: LocalDetectionKind;
  confidence: number;
  box: LocalDetectionBox;
  source: 'local_ml';
};

export type LocalDetectionResult = {
  detections: LocalDetection[];
  warnings: string[];
  modelPath: string;
  imageSize?: ImageSize | null;
  debug?: LocalDetectionDebugInfo | null;
};

export type ImageSize = {
  width: number;
  height: number;
};

export type LocalDetectionDebugInfo = {
  modelPath: string;
  classesPath: string;
  runtimeWasmPath: string | null;
  imageSize: ImageSize;
  inputTensorShape: number[];
  outputNames: string[];
  outputDims: readonly number[];
  rawDetectionsCount: number;
  confidenceThresholdCount: number;
  nmsDetectionsCount: number;
  excludedClassCount: number;
};

export const localDetectionKinds: LocalDetectionKind[] = [
  'bottle',
  'can',
  'carton',
  'cup',
  'wine_glass',
  'plastic_bottle',
  'drink_pack',
  'unknown',
];
