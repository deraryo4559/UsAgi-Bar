import {
  AdminAuthError,
  createAuthedSupabaseClient,
  requireAdmin,
} from '../_shared/adminAuth.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const SCHEMA_VERSION = 'inventory_object_detection.v1';
const INVENTORY_IMAGES_BUCKET = 'inventory-images';
const MAX_STORAGE_PATH_LENGTH = 512;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_DETECTIONS = 12;
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
const itemKinds = ['alcohol', 'drink', 'mixer', 'unknown'] as const;

type RequestBody = {
  bucket?: unknown;
  path?: unknown;
};

type DetectionBox2d = {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
};

type InventoryDetection = {
  detection_id: string;
  label: string;
  item_kind: (typeof itemKinds)[number];
  box_2d: DetectionBox2d;
  confidence: number;
  needs_review: boolean;
  notes: string | null;
};

type InventoryObjectDetectionResult = {
  schema_version: typeof SCHEMA_VERSION;
  source: {
    bucket: typeof INVENTORY_IMAGES_BUCKET;
    path: string;
  };
  detections: InventoryDetection[];
  warnings?: string[];
};

class FunctionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'FunctionError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStorageImageInput(body: RequestBody) {
  if (typeof body.bucket !== 'string' || typeof body.path !== 'string') {
    throw new FunctionError('bucket と path を文字列で送信してください。');
  }

  const bucket = body.bucket.trim();
  const path = body.path.trim();

  if (bucket !== INVENTORY_IMAGES_BUCKET) {
    throw new FunctionError(
      `検出に使えるStorage bucketは ${INVENTORY_IMAGES_BUCKET} のみです。`,
    );
  }

  if (!path) {
    throw new FunctionError('path が空です。Storage画像pathを指定してください。');
  }

  if (
    path.length > MAX_STORAGE_PATH_LENGTH ||
    path.startsWith('/') ||
    path.includes('..') ||
    path.includes('\\')
  ) {
    throw new FunctionError('path の形式が正しくありません。');
  }

  if (!path.startsWith('inventory/')) {
    throw new FunctionError('path は inventory/ 配下の画像だけ指定できます。');
  }

  return { bucket, path };
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function confidence(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : 0;
}

function clamp1000(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new FunctionError('Gemini応答のbox_2d座標が数値ではありません。', 502);
  }

  return Math.min(1000, Math.max(0, value));
}

function validateBox(value: unknown): DetectionBox2d {
  if (!isRecord(value)) {
    throw new FunctionError('Gemini応答のbox_2d形式が正しくありません。', 502);
  }

  const box = {
    ymin: clamp1000(value.ymin),
    xmin: clamp1000(value.xmin),
    ymax: clamp1000(value.ymax),
    xmax: clamp1000(value.xmax),
  };

  if (box.xmin >= box.xmax || box.ymin >= box.ymax) {
    throw new FunctionError('Gemini応答のbox_2d範囲が正しくありません。', 502);
  }

  return box;
}

function validateDetection(value: unknown, index: number): InventoryDetection {
  if (!isRecord(value)) {
    throw new FunctionError('Gemini応答の検出候補形式が正しくありません。', 502);
  }

  const itemKind = value.item_kind;

  if (!itemKinds.includes(itemKind as (typeof itemKinds)[number])) {
    throw new FunctionError('Gemini応答のitem_kindが正しくありません。', 502);
  }

  return {
    detection_id:
      typeof value.detection_id === 'string' && value.detection_id.trim()
        ? value.detection_id
        : `det-${index + 1}`,
    label:
      typeof value.label === 'string' && value.label.trim()
        ? value.label.trim()
        : `検出候補 ${index + 1}`,
    item_kind: itemKind as InventoryDetection['item_kind'],
    box_2d: validateBox(value.box_2d),
    confidence: confidence(value.confidence),
    needs_review:
      typeof value.needs_review === 'boolean' ? value.needs_review : true,
    notes: normalizeOptionalString(value.notes),
  };
}

function validateDetectionResult(
  value: unknown,
  path: string,
): InventoryObjectDetectionResult {
  if (!isRecord(value)) {
    throw new FunctionError('Gemini応答がJSONオブジェクトではありません。', 502);
  }

  if (value.schema_version !== SCHEMA_VERSION) {
    throw new FunctionError('Gemini応答のschema_versionが正しくありません。', 502);
  }

  if (!Array.isArray(value.detections)) {
    throw new FunctionError('Gemini応答のdetectionsが配列ではありません。', 502);
  }

  return {
    schema_version: SCHEMA_VERSION,
    source: {
      bucket: INVENTORY_IMAGES_BUCKET,
      path,
    },
    detections: value.detections
      .slice(0, MAX_DETECTIONS)
      .map(validateDetection),
  };
}

function createEmptyDetectionResult(path: string, warning: string) {
  return {
    schema_version: SCHEMA_VERSION,
    source: {
      bucket: INVENTORY_IMAGES_BUCKET,
      path,
    },
    detections: [],
    warnings: [warning],
  } satisfies InventoryObjectDetectionResult;
}

function buildPrompt(imagePath: string) {
  return `あなたは家庭用バー在庫管理アプリ「ウサギBar」の画像検出補助です。
画像内のお酒、ドリンク、割材候補の位置を検出し、JSONだけを返してください。

検出対象:
- 酒瓶、リキュール瓶、ワイン/日本酒/焼酎ボトル
- ドリンク、割材の瓶、缶、ペットボトル、紙パック
- カクテル作成に使う飲料・割材として登録できそうな商品

検出しないもの:
- グラス、人、手、背景、小物、棚、植物、装飾品、ラベルだけ、価格札

bounding boxルール:
- ボトル全体、缶全体、紙パック全体を囲んでください。
- ラベルだけではなく商品全体を囲んでください。
- 複数本ある場合はそれぞれ別のdetectionsにしてください。
- 重なっている場合は見えている範囲で構いません。
- 座標は [0, 1000] スケールで ymin / xmin / ymax / xmax を返してください。
- 不確かな候補は needs_review = true にしてください。

item_kind:
- alcohol
- drink
- mixer
- unknown

重要:
- カクテルレシピは生成しないでください。
- DB保存はしません。管理者が検出枠を確認してから切り抜き、登録候補化します。
- JSONのみを返してください。

image_path:
${imagePath}`;
}

const responseSchema = {
  type: 'object',
  required: ['schema_version', 'source', 'detections'],
  properties: {
    schema_version: { type: 'string', enum: [SCHEMA_VERSION] },
    source: {
      type: 'object',
      required: ['bucket', 'path'],
      properties: {
        bucket: { type: 'string', enum: [INVENTORY_IMAGES_BUCKET] },
        path: { type: 'string' },
      },
    },
    detections: {
      type: 'array',
      maxItems: MAX_DETECTIONS,
      items: {
        type: 'object',
        required: [
          'detection_id',
          'label',
          'item_kind',
          'box_2d',
          'confidence',
          'needs_review',
          'notes',
        ],
        properties: {
          detection_id: { type: 'string' },
          label: { type: 'string' },
          item_kind: { type: 'string', enum: itemKinds },
          box_2d: {
            type: 'object',
            required: ['ymin', 'xmin', 'ymax', 'xmax'],
            properties: {
              ymin: { type: 'number', minimum: 0, maximum: 1000 },
              xmin: { type: 'number', minimum: 0, maximum: 1000 },
              ymax: { type: 'number', minimum: 0, maximum: 1000 },
              xmax: { type: 'number', minimum: 0, maximum: 1000 },
            },
          },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          needs_review: { type: 'boolean' },
          notes: { type: ['string', 'null'] },
        },
      },
    },
  },
};

function getGeminiApiKey() {
  const apiKey = Deno.env.get('GEMINI_API_KEY');

  if (!apiKey) {
    throw new FunctionError('GEMINI_API_KEY が設定されていません。', 500);
  }

  return apiKey;
}

function extractGeminiText(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const candidates = value.candidates;

  if (!Array.isArray(candidates)) {
    return null;
  }

  for (const candidate of candidates) {
    if (!isRecord(candidate) || !isRecord(candidate.content)) {
      continue;
    }

    const parts = candidate.content.parts;

    if (!Array.isArray(parts)) {
      continue;
    }

    for (const part of parts) {
      if (isRecord(part) && typeof part.text === 'string') {
        return part.text;
      }
    }
  }

  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function downloadStorageImage({
  req,
  bucket,
  path,
}: {
  req: Request;
  bucket: string;
  path: string;
}) {
  const authorization = req.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    throw new FunctionError('ログインが必要です。', 401);
  }

  const supabase = createAuthedSupabaseClient(authorization);
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error || !data) {
    throw new FunctionError('Storage画像の取得に失敗しました。', 404);
  }

  const mimeType = data.type;

  if (!supportedMimeTypes.includes(mimeType as (typeof supportedMimeTypes)[number])) {
    throw new FunctionError(
      '画像形式は image/jpeg / image/png / image/webp のみ対応しています。',
    );
  }

  if (data.size > MAX_IMAGE_BYTES) {
    throw new FunctionError('画像サイズが大きすぎます。4MB以下にしてください。');
  }

  return {
    mimeType,
    base64: arrayBufferToBase64(await data.arrayBuffer()),
  };
}

async function callGemini({
  prompt,
  mimeType,
  base64,
}: {
  prompt: string;
  mimeType: string;
  base64: string;
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': getGeminiApiKey(),
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseJsonSchema: responseSchema,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new FunctionError(
      `Gemini API呼び出しに失敗しました。status=${response.status} ${detail.slice(0, 300)}`,
      502,
    );
  }

  const payload: unknown = await response.json();
  const text = extractGeminiText(payload);

  if (!text) {
    throw new FunctionError('Gemini応答にJSONテキストが含まれていません。', 502);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new FunctionError('Gemini応答JSONの解析に失敗しました。', 502);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'POST only.' }, 405);
  }

  let storageImage: { bucket: string; path: string } | null = null;

  try {
    await requireAdmin(req);

    const body = (await req.json()) as RequestBody;
    storageImage = normalizeStorageImageInput(body);
    const { bucket, path } = storageImage;
    const image = await downloadStorageImage({ req, bucket, path });
    const geminiResult = await callGemini({
      prompt: buildPrompt(path),
      mimeType: image.mimeType,
      base64: image.base64,
    });
    const result = validateDetectionResult(geminiResult, path);

    return jsonResponse(result);
  } catch (error) {
    if (
      storageImage &&
      error instanceof FunctionError &&
      error.status >= 500
    ) {
      return jsonResponse(
        createEmptyDetectionResult(
          storageImage.path,
          '複数アイテム検出をスキップし、画像全体解析へフォールバックします。',
        ),
      );
    }

    if (error instanceof AdminAuthError || error instanceof FunctionError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    return jsonResponse({ error: '複数アイテム検出に失敗しました。' }, 500);
  }
});
