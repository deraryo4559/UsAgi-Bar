import type { LocalDetectionKind } from './types';

export const LOCAL_DETECTION_CLASSES_SCHEMA_VERSION =
  'inventory_detector_classes.v1';

export const targetLocalDetectionClassNames = [
  'bottle',
  'cup',
  'wine glass',
  'can',
  'carton',
  'plastic bottle',
  'drink pack',
] as const;

export type LocalDetectionClassEntry = {
  id: number;
  name: string;
  kind: LocalDetectionKind;
  target: boolean;
};

export type LocalDetectionClassConfig = {
  schemaVersion: typeof LOCAL_DETECTION_CLASSES_SCHEMA_VERSION;
  classCount: number | null;
  classesById: Map<number, LocalDetectionClassEntry>;
  targetClassNames: Set<string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeClassName(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[_-]+/g, ' ').trim();
}

export function classNameToLocalDetectionKind(
  value: string,
): LocalDetectionKind {
  switch (normalizeClassName(value)) {
    case 'bottle':
      return 'bottle';
    case 'can':
      return 'can';
    case 'carton':
      return 'carton';
    case 'cup':
      return 'cup';
    case 'wine glass':
      return 'wine_glass';
    case 'plastic bottle':
      return 'plastic_bottle';
    case 'drink pack':
      return 'drink_pack';
    default:
      return 'unknown';
  }
}

function parseClassId(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error('classes.json の class id が正しくありません。');
  }

  return value;
}

function parseClassEntry(
  value: unknown,
  targetClassNames: Set<string>,
): LocalDetectionClassEntry {
  if (!isRecord(value)) {
    throw new Error('classes.json の classes 形式が正しくありません。');
  }

  if (typeof value.name !== 'string' || !value.name.trim()) {
    throw new Error('classes.json の class name が正しくありません。');
  }

  const name = normalizeClassName(value.name);
  const kind =
    typeof value.kind === 'string'
      ? classNameToLocalDetectionKind(value.kind)
      : classNameToLocalDetectionKind(name);

  return {
    id: parseClassId(value.id),
    name,
    kind,
    target:
      typeof value.target === 'boolean'
        ? value.target
        : targetClassNames.has(name),
  };
}

export function parseLocalDetectionClassConfig(
  value: unknown,
): LocalDetectionClassConfig {
  if (!isRecord(value)) {
    throw new Error('classes.json がJSONオブジェクトではありません。');
  }

  if (value.schema_version !== LOCAL_DETECTION_CLASSES_SCHEMA_VERSION) {
    throw new Error('classes.json の schema_version が正しくありません。');
  }

  const targetClassNames = new Set(
    (Array.isArray(value.target_class_names)
      ? value.target_class_names
      : targetLocalDetectionClassNames
    )
      .filter((name): name is string => typeof name === 'string')
      .map(normalizeClassName),
  );

  if (!Array.isArray(value.classes)) {
    throw new Error('classes.json の classes が配列ではありません。');
  }

  const classes = value.classes.map((entry) =>
    parseClassEntry(entry, targetClassNames),
  );
  const classesById = new Map(classes.map((entry) => [entry.id, entry]));
  const classCount =
    typeof value.class_count === 'number' &&
    Number.isInteger(value.class_count) &&
    value.class_count > 0
      ? value.class_count
      : null;

  return {
    schemaVersion: LOCAL_DETECTION_CLASSES_SCHEMA_VERSION,
    classCount,
    classesById,
    targetClassNames,
  };
}

export function getTargetClassEntry(
  config: LocalDetectionClassConfig,
  classId: number,
) {
  const entry = config.classesById.get(classId);

  if (!entry || !entry.target) {
    return null;
  }

  return entry;
}
