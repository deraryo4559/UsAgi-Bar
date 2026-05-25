import { describe, expect, it } from 'vitest';
import {
  classNameToLocalDetectionKind,
  parseLocalDetectionClassConfig,
} from './classConfig';
import {
  clampLocalDetectionBox,
  filterDetectionsByConfidence,
  normalizeLocalDetectionBox,
} from './detectionValidation';
import {
  postprocessRawYoloDetections,
  getIntersectionOverUnion,
} from './detectionPostprocess';
import {
  createLocalDetectionDrafts,
  getAcceptedLocalDetectionDrafts,
  setLocalDetectionAccepted,
} from './detectionUiMapper';
import { createLocalDetectionFallbackResult } from './localObjectDetector';
import {
  buildLocalDetectionDebugInfo,
  getYoloOutputLayout,
  LOCAL_DETECTION_CONFIG,
} from './yoloDetector';
import type { LocalDetection } from './types';

const imageSize = { width: 1000, height: 800 };

const detection: LocalDetection = {
  detectionId: 'local-1',
  label: 'bottle',
  kind: 'bottle',
  confidence: 0.8,
  box: { xmin: 100, ymin: 120, xmax: 260, ymax: 720 },
  source: 'local_ml',
};

const classConfig = parseLocalDetectionClassConfig({
  schema_version: 'inventory_detector_classes.v1',
  class_count: 80,
  target_class_names: ['bottle', 'cup', 'wine glass'],
  classes: [
    { id: 0, name: 'person', target: false },
    { id: 39, name: 'bottle', target: true },
    { id: 40, name: 'wine glass', target: true },
    { id: 41, name: 'cup', target: true },
  ],
});

describe('localDetection', () => {
  it('clamps local detection boxes to image bounds', () => {
    expect(
      clampLocalDetectionBox(
        { xmin: -10, ymin: 20, xmax: 1200, ymax: 900 },
        imageSize,
      ),
    ).toEqual({ xmin: 0, ymin: 20, xmax: 1000, ymax: 800 });
  });

  it('rejects invalid local detection boxes', () => {
    expect(() =>
      normalizeLocalDetectionBox(
        { xmin: 500, ymin: 20, xmax: 100, ymax: 700 },
        imageSize,
      ),
    ).toThrow('xmin < xmax');
  });

  it('filters detections by confidence', () => {
    expect(
      filterDetectionsByConfidence(
        [
          detection,
          { ...detection, detectionId: 'local-2', confidence: 0.2 },
        ],
        0.35,
      ).map((item) => item.detectionId),
    ).toEqual(['local-1']);
  });

  it('maps YOLO raw detections to UI-safe target classes', () => {
    const result = postprocessRawYoloDetections({
      rawDetections: [
        {
          labelIndex: 39,
          confidence: 0.9,
          box: { xmin: 100, ymin: 100, xmax: 300, ymax: 700 },
        },
      ],
      imageSize,
      minConfidence: LOCAL_DETECTION_CONFIG.confidenceThreshold,
      iouThreshold: LOCAL_DETECTION_CONFIG.iouThreshold,
      maxDetections: LOCAL_DETECTION_CONFIG.maxDetections,
      classConfig,
    });

    expect(result.detections[0]).toMatchObject({
      label: 'bottle',
      kind: 'bottle',
      source: 'local_ml',
    });
  });

  it('excludes non-target classes', () => {
    const result = postprocessRawYoloDetections({
      rawDetections: [
        {
          labelIndex: 0,
          confidence: 0.95,
          box: { xmin: 100, ymin: 100, xmax: 300, ymax: 700 },
        },
      ],
      imageSize,
      minConfidence: LOCAL_DETECTION_CONFIG.confidenceThreshold,
      iouThreshold: LOCAL_DETECTION_CONFIG.iouThreshold,
      maxDetections: LOCAL_DETECTION_CONFIG.maxDetections,
      classConfig,
    });

    expect(result.detections).toHaveLength(0);
    expect(result.excludedClassCount).toBe(1);
  });

  it('uses non-max suppression inputs to avoid duplicated boxes', () => {
    expect(
      getIntersectionOverUnion(
        { xmin: 0, ymin: 0, xmax: 100, ymax: 100 },
        { xmin: 10, ymin: 10, xmax: 110, ymax: 110 },
      ),
    ).toBeGreaterThan(0.5);
  });

  it('tracks accepted detections for crop targets', () => {
    const drafts = setLocalDetectionAccepted(
      createLocalDetectionDrafts([detection]),
      'local-1',
      false,
    );

    expect(getAcceptedLocalDetectionDrafts(drafts)).toEqual([]);
  });

  it('parses class mappings and normalizes known target names', () => {
    expect(classNameToLocalDetectionKind('wine glass')).toBe('wine_glass');
    expect(classNameToLocalDetectionKind('plastic-bottle')).toBe(
      'plastic_bottle',
    );
    expect(classConfig.classesById.get(41)).toMatchObject({
      name: 'cup',
      target: true,
    });
  });

  it('rejects invalid classes.json mapping', () => {
    expect(() =>
      parseLocalDetectionClassConfig({
        schema_version: 'inventory_detector_classes.v1',
        classes: [{ id: -1, name: 'bottle' }],
      }),
    ).toThrow('class id');
  });

  it('detects supported YOLO output layouts', () => {
    expect(
      getYoloOutputLayout({ dims: [1, 84, 8400], classCountHint: 80 }),
    ).toMatchObject({
      transposed: true,
      detectionCount: 8400,
      featureCount: 84,
      classScoreStart: 4,
    });
    expect(
      getYoloOutputLayout({ dims: [1, 8400, 84], classCountHint: 80 }),
    ).toMatchObject({
      transposed: false,
      detectionCount: 8400,
      featureCount: 84,
      classScoreStart: 4,
    });
  });

  it('throws a clear error for unsupported YOLO output shape', () => {
    expect(() =>
      getYoloOutputLayout({ dims: [1, 10], classCountHint: 80 }),
    ).toThrow('出力形式が想定と違います');
  });

  it('creates debug info for model parser verification', () => {
    expect(
      buildLocalDetectionDebugInfo({
        modelPath: 'models/inventory-detector/model.onnx',
        classesPath: 'models/inventory-detector/classes.json',
        runtimeWasmPath: '/assets/ort-wasm-simd-threaded.jsep.wasm',
        imageSize,
        outputNames: ['output0'],
        outputDims: [1, 84, 8400],
        rawDetectionsCount: 8400,
        confidenceThresholdCount: 4,
        nmsDetectionsCount: 2,
        excludedClassCount: 12,
      }),
    ).toMatchObject({
      imageSize,
      inputTensorShape: [1, 3, 640, 640],
      outputDims: [1, 84, 8400],
      nmsDetectionsCount: 2,
    });
  });

  it('keeps a fallback reason when the model is missing', () => {
    expect(
      createLocalDetectionFallbackResult({
        message: 'model.onnx が存在しません。',
        modelPath: 'models/inventory-detector/model.onnx',
      }),
    ).toMatchObject({
      detections: [],
      warnings: ['model.onnx が存在しません。'],
    });
  });
});
