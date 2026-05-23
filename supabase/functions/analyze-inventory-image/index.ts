import {
  AdminAuthError,
  createAuthedSupabaseClient,
  requireAdmin,
} from '../_shared/adminAuth.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const SCHEMA_VERSION = 'ai_inventory_image_registration.v1';
const INVENTORY_IMAGES_BUCKET = 'inventory-images';
const MAX_STORAGE_PATH_LENGTH = 512;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

type RequestBody = {
  bucket?: unknown;
  path?: unknown;
};

type AiInventoryCandidate = {
  candidate_id: string;
  name: string | null;
  item_type: 'alcohol' | 'drink' | 'mixer' | 'other' | null;
  category: string | null;
  sub_category: string | null;
  alcohol_percentage: number | null;
  volume_ml: number | null;
  remaining_ml: number | null;
  memo: string | null;
  confidence: number;
  needs_review: boolean;
  needs_review_reasons: string[];
  evidence: {
    visible_text: string[];
    visual_cues: string[];
    inferred_fields: string[];
    uncertainty_notes: string[];
  };
};

type ImageAssessment = {
  single_item_likely: boolean;
  multiple_items_likely: boolean;
  label_readable: boolean;
  needs_review: boolean;
  notes: string | null;
};

type AiInventoryImageAnalysisResult = {
  schema_version: typeof SCHEMA_VERSION;
  source: {
    kind: 'gemini_vision';
    image_path: string;
  };
  image_assessment: ImageAssessment;
  candidates: AiInventoryCandidate[];
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
      `画像解析に使えるStorage bucketは ${INVENTORY_IMAGES_BUCKET} のみです。`,
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

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function confidence(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : 0;
}

function validateCandidate(value: unknown, index: number): AiInventoryCandidate {
  if (!isRecord(value)) {
    throw new FunctionError('Gemini応答の候補形式が正しくありません。', 502);
  }

  const itemType = value.item_type;

  if (
    itemType !== null &&
    itemType !== 'alcohol' &&
    itemType !== 'drink' &&
    itemType !== 'mixer' &&
    itemType !== 'other'
  ) {
    throw new FunctionError('Gemini応答のitem_typeが正しくありません。', 502);
  }

  const evidence = isRecord(value.evidence) ? value.evidence : {};

  return {
    candidate_id:
      typeof value.candidate_id === 'string' && value.candidate_id.trim()
        ? value.candidate_id
        : `candidate-${index + 1}`,
    name: normalizeOptionalString(value.name),
    item_type: itemType ?? null,
    category: normalizeOptionalString(value.category),
    sub_category: normalizeOptionalString(value.sub_category),
    alcohol_percentage: numberOrNull(value.alcohol_percentage),
    volume_ml: numberOrNull(value.volume_ml),
    remaining_ml: numberOrNull(value.remaining_ml),
    memo: normalizeOptionalString(value.memo),
    confidence: confidence(value.confidence),
    needs_review:
      typeof value.needs_review === 'boolean' ? value.needs_review : true,
    needs_review_reasons: stringArray(value.needs_review_reasons),
    evidence: {
      visible_text: stringArray(evidence.visible_text),
      visual_cues: stringArray(evidence.visual_cues),
      inferred_fields: stringArray(evidence.inferred_fields),
      uncertainty_notes: stringArray(evidence.uncertainty_notes),
    },
  };
}

function validateImageAssessment(value: unknown): ImageAssessment {
  if (!isRecord(value)) {
    throw new FunctionError(
      'Gemini応答のimage_assessment形式が正しくありません。',
      502,
    );
  }

  return {
    single_item_likely: value.single_item_likely === true,
    multiple_items_likely: value.multiple_items_likely === true,
    label_readable: value.label_readable === true,
    needs_review:
      typeof value.needs_review === 'boolean' ? value.needs_review : true,
    notes: normalizeOptionalString(value.notes),
  };
}

function validateAnalysisResult(
  value: unknown,
  imagePath: string,
): AiInventoryImageAnalysisResult {
  if (!isRecord(value)) {
    throw new FunctionError('Gemini応答がJSONオブジェクトではありません。', 502);
  }

  if (value.schema_version !== SCHEMA_VERSION) {
    throw new FunctionError('Gemini応答のschema_versionが正しくありません。', 502);
  }

  if (!Array.isArray(value.candidates) || value.candidates.length === 0) {
    throw new FunctionError('Gemini応答に候補が含まれていません。', 502);
  }

  return {
    schema_version: SCHEMA_VERSION,
    source: {
      kind: 'gemini_vision',
      image_path: imagePath,
    },
    image_assessment: validateImageAssessment(value.image_assessment),
    candidates: value.candidates.slice(0, 3).map(validateCandidate),
  };
}

function buildPrompt(imagePath: string) {
  return `あなたは家庭用バー在庫管理アプリ「ウサギBar」の登録補助です。
画像に写っている酒、ドリンク、割材を見て、inventory_items に入力する候補JSONだけを返してください。

重要な制約:
- これはAI登録補助の主方式です。画像から読み取れる文字と視覚的な根拠だけを使ってください。
- カクテルレシピは生成しないでください。
- DB保存の判断は管理者が行います。保存前確認が必要な前提で needs_review を適切に立ててください。
- item_type は alcohol, drink, mixer, other のいずれかだけです。
- 商品名とカテゴリを分けてください。ブランド名や商品名そのものをcategoryにしないでください。
- category はレシピ照合しやすい標準材料名に寄せてください。
- 例: SUNTORY SUI は name: "SUNTORY SUI", category: "ジン"。
- 例: 三岳 は name: "三岳", category: "焼酎", sub_category: "芋焼酎"。
- 例: カルーア は name: "カルーア", category: "コーヒーリキュール"。
- 例: 浦霞 は name: "浦霞", category: "日本酒"。
- 画像から度数が読めない場合は推測で埋めず、alcohol_percentage は null にしてください。
- 容量が読める場合は volume_ml に入れてください。
- remaining_ml は画像から現在残量が明確に分かる場合以外は null にしてください。
- confidenceが高くても needs_review は true にして構いません。AI候補は直接保存されず、管理者確認が必須です。
- 複数商品が写っている可能性がある場合は image_assessment.multiple_items_likely を true にしてください。

category候補例:
ジン / ウォッカ / ラム / ウイスキー / 焼酎 / 日本酒 / ビール / コーヒーリキュール / トニックウォーター / コーラ / ジンジャーエール / オレンジジュース / ライムジュース / レモンジュース / カシスリキュール

image_path:
${imagePath}

JSONのみを返してください。`;
}

const responseSchema = {
  type: 'object',
  required: ['schema_version', 'source', 'image_assessment', 'candidates'],
  properties: {
    schema_version: { type: 'string', enum: [SCHEMA_VERSION] },
    source: {
      type: 'object',
      required: ['kind', 'image_path'],
      properties: {
        kind: { type: 'string', enum: ['gemini_vision'] },
        image_path: { type: 'string' },
      },
    },
    image_assessment: {
      type: 'object',
      required: [
        'single_item_likely',
        'multiple_items_likely',
        'label_readable',
        'needs_review',
        'notes',
      ],
      properties: {
        single_item_likely: { type: 'boolean' },
        multiple_items_likely: { type: 'boolean' },
        label_readable: { type: 'boolean' },
        needs_review: { type: 'boolean' },
        notes: { type: ['string', 'null'] },
      },
    },
    candidates: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        required: [
          'candidate_id',
          'name',
          'item_type',
          'category',
          'sub_category',
          'alcohol_percentage',
          'volume_ml',
          'remaining_ml',
          'memo',
          'confidence',
          'needs_review',
          'needs_review_reasons',
          'evidence',
        ],
        properties: {
          candidate_id: { type: 'string' },
          name: { type: ['string', 'null'] },
          item_type: {
            type: ['string', 'null'],
            enum: ['alcohol', 'drink', 'mixer', 'other', null],
          },
          category: { type: ['string', 'null'] },
          sub_category: { type: ['string', 'null'] },
          alcohol_percentage: { type: ['number', 'null'] },
          volume_ml: { type: ['number', 'null'] },
          remaining_ml: { type: ['number', 'null'] },
          memo: { type: ['string', 'null'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          needs_review: { type: 'boolean' },
          needs_review_reasons: {
            type: 'array',
            items: { type: 'string' },
          },
          evidence: {
            type: 'object',
            required: [
              'visible_text',
              'visual_cues',
              'inferred_fields',
              'uncertainty_notes',
            ],
            properties: {
              visible_text: {
                type: 'array',
                items: { type: 'string' },
              },
              visual_cues: {
                type: 'array',
                items: { type: 'string' },
              },
              inferred_fields: {
                type: 'array',
                items: { type: 'string' },
              },
              uncertainty_notes: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
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

  try {
    await requireAdmin(req);

    const body = (await req.json()) as RequestBody;
    const { bucket, path } = normalizeStorageImageInput(body);
    const image = await downloadStorageImage({ req, bucket, path });
    const geminiResult = await callGemini({
      prompt: buildPrompt(path),
      mimeType: image.mimeType,
      base64: image.base64,
    });
    const result = validateAnalysisResult(geminiResult, path);

    return jsonResponse(result);
  } catch (error) {
    if (error instanceof AdminAuthError || error instanceof FunctionError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    return jsonResponse({ error: '画像AI候補作成に失敗しました。' }, 500);
  }
});
