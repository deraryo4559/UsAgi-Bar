import type { InferenceSession, Tensor } from 'onnxruntime-web';
import {
  postprocessRawYoloDetections,
  type RawYoloDetection,
} from './detectionPostprocess';
import {
  parseLocalDetectionClassConfig,
  type LocalDetectionClassConfig,
} from './classConfig';
import type {
  ImageSize,
  LocalDetectionDebugInfo,
  LocalDetectionResult,
} from './types';

export const DEFAULT_LOCAL_DETECTION_MODEL_PATH =
  'models/inventory-detector/model.onnx';
export const DEFAULT_LOCAL_DETECTION_CLASSES_PATH =
  'models/inventory-detector/classes.json';
export const DEFAULT_ONNX_RUNTIME_WASM_PATH =
  'models/inventory-detector/ort-wasm-simd-threaded.jsep.wasm';

const MODEL_INPUT_SIZE = 640;
export const LOCAL_DETECTION_CONFIG = {
  confidenceThreshold: 0.25,
  iouThreshold: 0.45,
  maxDetections: 12,
} as const;
export const ENABLE_LOCAL_DETECTION_DEBUG = false;

let onnxRuntimeConfigured = false;
let runtimeWasmPath: string | null = null;

export class LocalDetectionModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocalDetectionModelError';
  }
}

function resolveModelPath(modelPath: string) {
  if (/^https?:\/\//.test(modelPath) || modelPath.startsWith('/')) {
    return modelPath;
  }

  const base = import.meta.env.BASE_URL || './';
  return `${base}${modelPath}`.replace(/\/{2,}/g, '/');
}

function resolveClassesPath(modelPath: string) {
  const resolvedModelPath = resolveModelPath(modelPath);
  const lastSlashIndex = resolvedModelPath.lastIndexOf('/');

  if (lastSlashIndex === -1) {
    return resolveModelPath(DEFAULT_LOCAL_DETECTION_CLASSES_PATH);
  }

  return `${resolvedModelPath.slice(0, lastSlashIndex)}/classes.json`;
}

function resolveAssetUrl(assetUrl: string) {
  if (typeof window === 'undefined') {
    return assetUrl;
  }

  return new URL(assetUrl, window.location.href).href;
}

async function loadOnnxRuntime() {
  const ort = await import('onnxruntime-web');

  if (!onnxRuntimeConfigured) {
    runtimeWasmPath = resolveAssetUrl(
      resolveModelPath(DEFAULT_ONNX_RUNTIME_WASM_PATH),
    );

    // Keep the browser runtime single-threaded so ONNX Runtime can use the
    // bundled JS module and only needs this explicit .wasm URL. This avoids
    // GitHub Pages/HashRouter fallback HTML being loaded as WebAssembly.
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths = {
      wasm: runtimeWasmPath,
    };
    onnxRuntimeConfigured = true;
  }

  return ort;
}

function loadImage(imageUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new LocalDetectionModelError('検出元画像を読み込めませんでした。'));
    image.src = imageUrl;
  });
}

function imageToTensorData(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = MODEL_INPUT_SIZE;
  canvas.height = MODEL_INPUT_SIZE;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new LocalDetectionModelError('Canvasを初期化できませんでした。');
  }

  context.drawImage(image, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const imageData = context.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const tensorData = new Float32Array(3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);
  const pixels = imageData.data;
  const channelSize = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;

  for (let index = 0; index < channelSize; index += 1) {
    const pixelIndex = index * 4;
    tensorData[index] = pixels[pixelIndex] / 255;
    tensorData[channelSize + index] = pixels[pixelIndex + 1] / 255;
    tensorData[channelSize * 2 + index] = pixels[pixelIndex + 2] / 255;
  }

  return tensorData;
}

function rowValue(
  data: Float32Array,
  dims: readonly number[],
  rowIndex: number,
  colIndex: number,
  transposed: boolean,
) {
  if (transposed) {
    const featureCount = dims[1];
    const detectionCount = dims[2];
    return data[colIndex * detectionCount + rowIndex] ?? data[rowIndex * featureCount + colIndex] ?? 0;
  }

  const featureCount = dims[2];
  return data[rowIndex * featureCount + colIndex] ?? 0;
}

export function getYoloOutputLayout({
  dims,
  classCountHint,
}: {
  dims: readonly number[];
  classCountHint: number | null;
}) {
  if (dims.length !== 3) {
    throw new LocalDetectionModelError(
      'ローカル検出モデルの出力形式が想定と違います。model.onnxの出力shapeを確認してください。',
    );
  }

  const transposed = dims[1] < dims[2];
  const detectionCount = transposed ? dims[2] : dims[1];
  const featureCount = transposed ? dims[1] : dims[2];

  if (featureCount < 5 || detectionCount <= 0) {
    throw new LocalDetectionModelError(
      'ローカル検出モデルの出力形式が想定と違います。model.onnxの出力shapeを確認してください。',
    );
  }

  let classScoreStart = 4;
  let hasObjectness = false;

  if (classCountHint !== null) {
    if (featureCount === classCountHint + 5) {
      classScoreStart = 5;
      hasObjectness = true;
    } else if (featureCount === classCountHint + 4) {
      classScoreStart = 4;
      hasObjectness = false;
    } else {
      throw new LocalDetectionModelError(
        'ローカル検出モデルの出力形式が想定と違います。model.onnxの出力shapeを確認してください。',
      );
    }
  }

  return {
    transposed,
    detectionCount,
    featureCount,
    classScoreStart,
    hasObjectness,
  };
}

export function parseYoloOutput({
  data,
  dims,
  imageSize,
  classCountHint,
}: {
  data: Float32Array;
  dims: readonly number[];
  imageSize: ImageSize;
  classCountHint: number | null;
}): RawYoloDetection[] {
  const {
    transposed,
    detectionCount,
    featureCount,
    classScoreStart,
    hasObjectness,
  } = getYoloOutputLayout({ dims, classCountHint });
  const rawDetections: RawYoloDetection[] = [];
  const scaleX = imageSize.width / MODEL_INPUT_SIZE;
  const scaleY = imageSize.height / MODEL_INPUT_SIZE;

  for (let rowIndex = 0; rowIndex < detectionCount; rowIndex += 1) {
    const xCenter = rowValue(data, dims, rowIndex, 0, transposed);
    const yCenter = rowValue(data, dims, rowIndex, 1, transposed);
    const width = rowValue(data, dims, rowIndex, 2, transposed);
    const height = rowValue(data, dims, rowIndex, 3, transposed);
    const objectness = hasObjectness
      ? rowValue(data, dims, rowIndex, 4, transposed)
      : 1;
    let bestScore = 0;
    let bestLabelIndex = 0;

    for (
      let featureIndex = classScoreStart;
      featureIndex < featureCount;
      featureIndex += 1
    ) {
      const score = rowValue(data, dims, rowIndex, featureIndex, transposed);

      if (score > bestScore) {
        bestScore = score;
        bestLabelIndex = featureIndex - classScoreStart;
      }
    }

    const normalized = xCenter <= 1 && yCenter <= 1 && width <= 1 && height <= 1;
    const modelX = normalized ? xCenter * MODEL_INPUT_SIZE : xCenter;
    const modelY = normalized ? yCenter * MODEL_INPUT_SIZE : yCenter;
    const modelWidth = normalized ? width * MODEL_INPUT_SIZE : width;
    const modelHeight = normalized ? height * MODEL_INPUT_SIZE : height;

    rawDetections.push({
      labelIndex: bestLabelIndex,
      confidence: objectness * bestScore,
      box: {
        xmin: (modelX - modelWidth / 2) * scaleX,
        ymin: (modelY - modelHeight / 2) * scaleY,
        xmax: (modelX + modelWidth / 2) * scaleX,
        ymax: (modelY + modelHeight / 2) * scaleY,
      },
    });
  }

  return rawDetections;
}

export function buildLocalDetectionDebugInfo({
  modelPath,
  classesPath,
  runtimeWasmPath,
  imageSize,
  outputNames,
  outputDims,
  rawDetectionsCount,
  confidenceThresholdCount,
  nmsDetectionsCount,
  excludedClassCount,
}: Omit<LocalDetectionDebugInfo, 'inputTensorShape'>) {
  return {
    modelPath,
    classesPath,
    runtimeWasmPath,
    imageSize,
    inputTensorShape: [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE],
    outputNames,
    outputDims,
    rawDetectionsCount,
    confidenceThresholdCount,
    nmsDetectionsCount,
    excludedClassCount,
  } satisfies LocalDetectionDebugInfo;
}

export class YoloLocalObjectDetector {
  private session: InferenceSession | null = null;
  private tensorFactory: typeof Tensor | null = null;
  private classConfig: LocalDetectionClassConfig | null = null;

  constructor(private readonly modelPath = DEFAULT_LOCAL_DETECTION_MODEL_PATH) {}

  private async loadClassConfig() {
    if (this.classConfig) {
      return this.classConfig;
    }

    const classesPath = resolveClassesPath(this.modelPath);
    const response = await fetch(classesPath);

    if (!response.ok) {
      throw new LocalDetectionModelError(
        'classes.json が存在しません。public/models/inventory-detector/classes.json を配置してください。',
      );
    }

    try {
      this.classConfig = parseLocalDetectionClassConfig(await response.json());
      return this.classConfig;
    } catch (error) {
      throw new LocalDetectionModelError(
        error instanceof Error
          ? error.message
          : 'classes.json の読み込みに失敗しました。',
      );
    }
  }

  private async loadSession() {
    if (this.session && this.tensorFactory) {
      return {
        session: this.session,
        Tensor: this.tensorFactory,
      };
    }

    const resolvedPath = resolveModelPath(this.modelPath);
    const modelResponse = await fetch(resolvedPath);

    if (!modelResponse.ok) {
      throw new LocalDetectionModelError(
        'model.onnx が存在しません。public/models/inventory-detector/model.onnx を配置してください。',
      );
    }

    const { InferenceSession, Tensor } = await loadOnnxRuntime();
    const modelBuffer = await modelResponse.arrayBuffer();
    try {
      this.session = await InferenceSession.create(modelBuffer, {
        executionProviders: ['wasm'],
      });
    } catch {
      throw new LocalDetectionModelError(
        'モデル読み込みに失敗しました。ONNX形式とopsetを確認してください。',
      );
    }
    this.tensorFactory = Tensor;

    return {
      session: this.session,
      Tensor: this.tensorFactory,
    };
  }

  async detect(imageUrl: string): Promise<LocalDetectionResult> {
    const resolvedPath = resolveModelPath(this.modelPath);
    const classesPath = resolveClassesPath(this.modelPath);
    const image = await loadImage(imageUrl);
    const imageSize = {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
    const classConfig = await this.loadClassConfig();
    const loaded = await this.loadSession();
    const tensor = new loaded.Tensor('float32', imageToTensorData(image), [
      1,
      3,
      MODEL_INPUT_SIZE,
      MODEL_INPUT_SIZE,
    ]);
    const inputName = loaded.session.inputNames[0];
    const output = await loaded.session.run({ [inputName]: tensor });
    const outputTensor = output[loaded.session.outputNames[0]] as Tensor;
    const data =
      outputTensor.data instanceof Float32Array
        ? outputTensor.data
        : new Float32Array(outputTensor.data as ArrayLike<number>);
    const rawDetections = parseYoloOutput({
      data,
      dims: outputTensor.dims,
      imageSize,
      classCountHint: classConfig.classCount,
    });
    const postprocessed = postprocessRawYoloDetections({
      rawDetections,
      imageSize,
      minConfidence: LOCAL_DETECTION_CONFIG.confidenceThreshold,
      iouThreshold: LOCAL_DETECTION_CONFIG.iouThreshold,
      maxDetections: LOCAL_DETECTION_CONFIG.maxDetections,
      classConfig,
    });
    const debug = buildLocalDetectionDebugInfo({
      modelPath: resolvedPath,
      classesPath,
      runtimeWasmPath,
      imageSize,
      outputNames: [...loaded.session.outputNames],
      outputDims: outputTensor.dims,
      rawDetectionsCount: rawDetections.length,
      confidenceThresholdCount: postprocessed.confidenceThresholdCount,
      nmsDetectionsCount: postprocessed.nmsDetectionsCount,
      excludedClassCount: postprocessed.excludedClassCount,
    });

    if (ENABLE_LOCAL_DETECTION_DEBUG) {
      console.debug('[UsAgi-Bar local detection]', debug);
    }

    return {
      detections: postprocessed.detections,
      warnings: [],
      modelPath: resolvedPath,
      imageSize,
      debug,
    };
  }
}
