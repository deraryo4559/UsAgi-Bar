import {
  AdminAuthError,
  createAuthedSupabaseClient,
  requireAdmin,
} from '../_shared/adminAuth.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { Buffer } from 'node:buffer';
import { PNG } from 'npm:pngjs@7.0.0';

const INVENTORY_IMAGES_BUCKET = 'inventory-images';
const INVENTORY_THUMBNAILS_BUCKET = 'inventory-thumbnails';
const MAX_STORAGE_PATH_LENGTH = 512;
const MAX_SOURCE_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_PROMPT_LENGTH = 1200;
const CLOUDFLARE_MODEL =
  Deno.env.get('CLOUDFLARE_IMAGE_MODEL') ??
  '@cf/runwayml/stable-diffusion-v1-5-img2img';
const GENERATION_WIDTH = 768;
const GENERATION_HEIGHT = 1024;
const OUTPUT_WIDTH = 512;
const OUTPUT_HEIGHT = 768;
const OUTPUT_PADDING = 34;
const MAX_GENERATION_SUBJECT_ASPECT = 0.62;
const MAX_OUTPUT_SUBJECT_ASPECT = 0.72;
const supportedSourceMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const supportedOutputMimeTypes = ['image/png', 'image/webp'];

type RequestBody = {
  source?: {
    bucket?: unknown;
    path?: unknown;
  };
  prompt?: unknown;
  candidateId?: unknown;
};

type NormalizedInput = {
  source: {
    bucket: string;
    path: string;
  };
  prompt: string;
  candidateId: string;
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

function normalizePath(path: string) {
  const trimmed = path.trim();

  if (!trimmed) {
    throw new FunctionError('source.path が空です。');
  }

  if (
    trimmed.length > MAX_STORAGE_PATH_LENGTH ||
    trimmed.startsWith('/') ||
    trimmed.includes('..') ||
    trimmed.includes('\\')
  ) {
    throw new FunctionError('source.path の形式が正しくありません。');
  }

  if (!trimmed.startsWith('inventory/')) {
    throw new FunctionError('source.path は inventory/ 配下の画像だけ指定できます。');
  }

  return trimmed;
}

function normalizeCandidateId(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return `candidate-${crypto.randomUUID()}`;
  }

  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
}

function normalizeInput(body: RequestBody): NormalizedInput {
  if (!isRecord(body.source)) {
    throw new FunctionError('source.bucket と source.path を指定してください。');
  }

  if (
    typeof body.source.bucket !== 'string' ||
    typeof body.source.path !== 'string'
  ) {
    throw new FunctionError('source.bucket と source.path は文字列で送信してください。');
  }

  const bucket = body.source.bucket.trim();

  if (bucket !== INVENTORY_IMAGES_BUCKET) {
    throw new FunctionError(
      `サムネイル生成に使える元画像bucketは ${INVENTORY_IMAGES_BUCKET} のみです。`,
    );
  }

  if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
    throw new FunctionError('thumbnail prompt を指定してください。');
  }

  const prompt = body.prompt.trim();

  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new FunctionError(
      `thumbnail prompt は${MAX_PROMPT_LENGTH}文字以内にしてください。`,
    );
  }

  return {
    source: {
      bucket,
      path: normalizePath(body.source.path),
    },
    prompt,
    candidateId: normalizeCandidateId(body.candidateId),
  };
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new FunctionError(`${name} が設定されていません。`, 500);
  }

  return value;
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

function bytesToBase64(bytes: Uint8Array) {
  return arrayBufferToBase64(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

function base64ToBytes(value: string) {
  const clean = value.includes(',') ? value.split(',').pop() ?? '' : value;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function buildGenerationPrompt(prompt: string) {
  return [
    prompt,
    'Create a polished app thumbnail, not a product photo.',
    'One full drink container only, full bottle or can visible, centered, upright, large in frame.',
    'Clean 2D/3D hybrid illustration, crisp silhouette, simplified label shapes, smooth vector-like edges.',
    'Preserve the broad container shape, main label color blocks, cap color, bottle/can proportions.',
    'Keep natural upright bottle or can proportions; do not stretch sideways, do not flatten the container, ignore cropped neighboring objects.',
    'Use a plain pure white or transparent background so it can be removed cleanly.',
    'No readable text, no exact brand logo, no shelf, no table, no hands, no extra props.',
  ].join(' ');
}

function pngBytes(bytes: Uint8Array) {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

function colorDistanceSq(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

function estimateEdgeBackgroundColor(png: PNG) {
  const patch = Math.min(28, Math.floor(Math.min(png.width, png.height) / 8));
  const ranges = [
    { x0: 0, x1: patch, y0: 0, y1: patch },
    { x0: png.width - patch, x1: png.width, y0: 0, y1: patch },
    { x0: 0, x1: patch, y0: png.height - patch, y1: png.height },
    {
      x0: png.width - patch,
      x1: png.width,
      y0: png.height - patch,
      y1: png.height,
    },
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (const range of ranges) {
    for (let y = range.y0; y < range.y1; y += 1) {
      for (let x = range.x0; x < range.x1; x += 1) {
        const index = (png.width * y + x) << 2;
        const alpha = png.data[index + 3];

        if (alpha < 8) {
          continue;
        }

        r += png.data[index];
        g += png.data[index + 1];
        b += png.data[index + 2];
        count += 1;
      }
    }
  }

  if (count === 0) {
    return { r: 255, g: 255, b: 255 };
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

function markEdgeConnectedBackground(png: PNG) {
  const width = png.width;
  const height = png.height;
  const background = estimateEdgeBackgroundColor(png);
  const marked = new Uint8Array(width * height);
  const queue: number[] = [];
  const thresholdSq = 58 * 58;

  function isBackgroundPixel(x: number, y: number) {
    const dataIndex = (width * y + x) << 2;
    const alpha = png.data[dataIndex + 3];

    if (alpha < 16) {
      return true;
    }

    return (
      colorDistanceSq(
        png.data[dataIndex],
        png.data[dataIndex + 1],
        png.data[dataIndex + 2],
        background.r,
        background.g,
        background.b,
      ) <= thresholdSq
    );
  }

  function enqueue(x: number, y: number) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    const index = width * y + x;

    if (marked[index] || !isBackgroundPixel(x, y)) {
      return;
    }

    marked[index] = 1;
    queue.push(index);
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return marked;
}

function removeBackground(png: PNG) {
  const marked = markEdgeConnectedBackground(png);

  for (let pixelIndex = 0; pixelIndex < marked.length; pixelIndex += 1) {
    if (marked[pixelIndex]) {
      const dataIndex = pixelIndex << 2;
      png.data[dataIndex] = 0;
      png.data[dataIndex + 1] = 0;
      png.data[dataIndex + 2] = 0;
      png.data[dataIndex + 3] = 0;
    }
  }

  // Feather only edge-adjacent pixels so bottle labels inside the object are not erased.
  const width = png.width;
  const height = png.height;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixelIndex = width * y + x;

      if (marked[pixelIndex]) {
        continue;
      }

      const touchesBackground =
        marked[pixelIndex - 1] ||
        marked[pixelIndex + 1] ||
        marked[pixelIndex - width] ||
        marked[pixelIndex + width];

      if (touchesBackground) {
        const dataIndex = pixelIndex << 2;
        png.data[dataIndex + 3] = Math.max(
          0,
          Math.min(255, png.data[dataIndex + 3] - 28),
        );
      }
    }
  }
}

function keepLargestOpaqueComponent(png: PNG) {
  const width = png.width;
  const height = png.height;
  const visited = new Uint8Array(width * height);
  let largestComponent: number[] = [];

  function isOpaque(pixelIndex: number) {
    return png.data[(pixelIndex << 2) + 3] > 24;
  }

  for (let start = 0; start < visited.length; start += 1) {
    if (visited[start] || !isOpaque(start)) {
      continue;
    }

    const component: number[] = [];
    const queue = [start];
    visited[start] = 1;

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      const x = index % width;
      const y = Math.floor(index / width);
      component.push(index);

      const neighbors = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];

      for (const neighbor of neighbors) {
        if (neighbor < 0 || visited[neighbor] || !isOpaque(neighbor)) {
          continue;
        }

        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }

    if (component.length > largestComponent.length) {
      largestComponent = component;
    }
  }

  if (largestComponent.length === 0) {
    return;
  }

  const keep = new Uint8Array(width * height);

  for (const pixelIndex of largestComponent) {
    keep[pixelIndex] = 1;
  }

  for (let pixelIndex = 0; pixelIndex < keep.length; pixelIndex += 1) {
    if (!keep[pixelIndex]) {
      png.data[(pixelIndex << 2) + 3] = 0;
    }
  }
}

function opaqueBounds(png: PNG) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alpha = png.data[((png.width * y + x) << 2) + 3];

      if (alpha > 24) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function sampleNearest(png: PNG, x: number, y: number) {
  const sx = Math.max(0, Math.min(png.width - 1, Math.round(x)));
  const sy = Math.max(0, Math.min(png.height - 1, Math.round(y)));
  const index = (png.width * sy + sx) << 2;
  return [
    png.data[index],
    png.data[index + 1],
    png.data[index + 2],
    png.data[index + 3],
  ];
}

function setPixel(png: PNG, x: number, y: number, rgba: number[]) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
    return;
  }

  const index = (png.width * y + x) << 2;
  png.data[index] = rgba[0];
  png.data[index + 1] = rgba[1];
  png.data[index + 2] = rgba[2];
  png.data[index + 3] = rgba[3];
}

function fillPng(png: PNG, rgba: [number, number, number, number]) {
  for (let index = 0; index < png.data.length; index += 4) {
    png.data[index] = rgba[0];
    png.data[index + 1] = rgba[1];
    png.data[index + 2] = rgba[2];
    png.data[index + 3] = rgba[3];
  }
}

function drawObjectLayer({
  source,
  bounds,
  width,
  height,
  padding,
  maxSubjectAspect,
  background,
}: {
  source: PNG;
  bounds: NonNullable<ReturnType<typeof opaqueBounds>>;
  width: number;
  height: number;
  padding: number;
  maxSubjectAspect: number;
  background?: [number, number, number, number];
}) {
  const output = new PNG({ width, height });
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const sourceAspect = bounds.width / bounds.height;
  const normalizedBoundsWidth =
    sourceAspect > maxSubjectAspect
      ? bounds.height * maxSubjectAspect
      : bounds.width;
  const scale = Math.min(
    availableWidth / normalizedBoundsWidth,
    availableHeight / bounds.height,
  );
  const drawWidth = Math.max(1, Math.round(normalizedBoundsWidth * scale));
  const drawHeight = Math.max(1, Math.round(bounds.height * scale));
  const offsetX = Math.floor((width - drawWidth) / 2);
  const offsetY = Math.floor((height - drawHeight) / 2);

  if (background) {
    fillPng(output, background);
  }

  for (let y = 0; y < drawHeight; y += 1) {
    for (let x = 0; x < drawWidth; x += 1) {
      const sourceX = bounds.x + (x / drawWidth) * bounds.width;
      const sourceY = bounds.y + y / scale;
      const rgba = sampleNearest(source, sourceX, sourceY);

      if (rgba[3] > 0) {
        if (background) {
          const alpha = rgba[3] / 255;
          setPixel(output, offsetX + x, offsetY + y, [
            Math.round(rgba[0] * alpha + background[0] * (1 - alpha)),
            Math.round(rgba[1] * alpha + background[1] * (1 - alpha)),
            Math.round(rgba[2] * alpha + background[2] * (1 - alpha)),
            255,
          ]);
        } else {
          setPixel(output, offsetX + x, offsetY + y, rgba);
        }
      }
    }
  }

  return output;
}

function preprocessSourceImageForGeneration(bytes: Uint8Array) {
  if (!pngBytes(bytes)) {
    return {
      base64: bytesToBase64(bytes),
      applied: false,
    };
  }

  try {
    const source = PNG.sync.read(Buffer.from(bytes));
    removeBackground(source);
    keepLargestOpaqueComponent(source);
    const bounds = opaqueBounds(source);

    if (!bounds) {
      return {
        base64: bytesToBase64(bytes),
        applied: false,
      };
    }

    const prepared = drawObjectLayer({
      source,
      bounds,
      width: GENERATION_WIDTH,
      height: GENERATION_HEIGHT,
      padding: 92,
      maxSubjectAspect: MAX_GENERATION_SUBJECT_ASPECT,
      background: [255, 255, 255, 255],
    });

    return {
      base64: bytesToBase64(PNG.sync.write(prepared)),
      applied: true,
    };
  } catch {
    return {
      base64: bytesToBase64(bytes),
      applied: false,
    };
  }
}

function addThumbnailOutline(layer: PNG) {
  const output = new PNG({ width: layer.width, height: layer.height });
  const radius = 2;

  // Subtle shelf-friendly shadow, still on transparent background.
  for (let y = 0; y < layer.height; y += 1) {
    for (let x = 0; x < layer.width; x += 1) {
      const alpha = layer.data[((layer.width * y + x) << 2) + 3];

      if (alpha > 32) {
        setPixel(output, x + 3, y + 5, [0, 0, 0, Math.min(42, alpha * 0.18)]);
      }
    }
  }

  for (let y = 0; y < layer.height; y += 1) {
    for (let x = 0; x < layer.width; x += 1) {
      const alpha = layer.data[((layer.width * y + x) << 2) + 3];

      if (alpha <= 32) {
        continue;
      }

      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (dx === 0 && dy === 0) {
            continue;
          }

          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= radius) {
            const outlineAlpha = Math.round((1 - distance / (radius + 0.5)) * 80);
            const ox = x + dx;
            const oy = y + dy;

            if (ox < 0 || oy < 0 || ox >= layer.width || oy >= layer.height) {
              continue;
            }

            const targetIndex = (layer.width * oy + ox) << 2;

            if (layer.data[targetIndex + 3] <= 20 && output.data[targetIndex + 3] < outlineAlpha) {
              setPixel(output, ox, oy, [255, 239, 196, outlineAlpha]);
            }
          }
        }
      }
    }
  }

  for (let index = 0; index < layer.data.length; index += 4) {
    const alpha = layer.data[index + 3];

    if (alpha > 0) {
      output.data[index] = layer.data[index];
      output.data[index + 1] = layer.data[index + 1];
      output.data[index + 2] = layer.data[index + 2];
      output.data[index + 3] = alpha;
    }
  }

  return output;
}

function postprocessGeneratedThumbnail(bytes: Uint8Array) {
  if (!pngBytes(bytes)) {
    return {
      bytes,
      mimeType: 'image/png',
      applied: false,
    };
  }

  try {
    const source = PNG.sync.read(Buffer.from(bytes));
    removeBackground(source);
    const bounds = opaqueBounds(source);

    if (!bounds) {
      return {
        bytes,
        mimeType: 'image/png',
        applied: false,
      };
    }

    keepLargestOpaqueComponent(source);
    const finalBounds = opaqueBounds(source) ?? bounds;
    const layer = drawObjectLayer({
      source,
      bounds: finalBounds,
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      padding: OUTPUT_PADDING,
      maxSubjectAspect: MAX_OUTPUT_SUBJECT_ASPECT,
    });
    const outlined = addThumbnailOutline(layer);

    return {
      bytes: new Uint8Array(PNG.sync.write(outlined)),
      mimeType: 'image/png',
      applied: true,
    };
  } catch {
    return {
      bytes,
      mimeType: 'image/png',
      applied: false,
    };
  }
}

async function downloadSourceImage({
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
    throw new FunctionError('元画像の取得に失敗しました。', 404);
  }

  if (!supportedSourceMimeTypes.includes(data.type)) {
    throw new FunctionError(
      '元画像形式は image/jpeg / image/png / image/webp のみ対応しています。',
    );
  }

  if (data.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new FunctionError('元画像サイズが大きすぎます。4MB以下にしてください。');
  }

  const bytes = new Uint8Array(await data.arrayBuffer());

  return {
    bytes,
    base64: bytesToBase64(bytes),
  };
}

function extractImageFromCloudflareJson(payload: unknown) {
  if (!isRecord(payload)) {
    return null;
  }

  const candidates = [
    payload.result,
    isRecord(payload.result) ? payload.result.image : null,
    isRecord(payload.result) ? payload.result.image_b64 : null,
    payload.image,
    payload.image_b64,
    payload.data,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return null;
}

async function callCloudflareImageGeneration({
  prompt,
  sourceBase64,
}: {
  prompt: string;
  sourceBase64: string;
}) {
  const accountId = requiredEnv('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = requiredEnv('CLOUDFLARE_API_TOKEN');
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CLOUDFLARE_MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: buildGenerationPrompt(prompt),
        negative_prompt:
          'photorealistic, raw photo, busy background, colored background, table, shelf, hand, person, readable text, exact brand logo, watermark, distorted label, extra objects, blurry, low quality, cropped bottle, tiny object, crushed object, square squat bottle, deformed can',
        image_b64: sourceBase64,
        width: GENERATION_WIDTH,
        height: GENERATION_HEIGHT,
        num_steps: 20,
        strength: 0.76,
        guidance: 9,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    const status =
      response.status === 400 ||
      response.status === 401 ||
      response.status === 403 ||
      response.status === 429
        ? response.status
        : 502;
    throw new FunctionError(
      `Cloudflare Workers AI呼び出しに失敗しました。status=${response.status} ${detail.slice(0, 240)}`,
      status,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.startsWith('image/')) {
    if (!supportedOutputMimeTypes.some((mimeType) => contentType.includes(mimeType))) {
      throw new FunctionError('生成画像の形式が対応外です。', 502);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    if (!pngBytes(bytes)) {
      throw new FunctionError(
        'Cloudflare生成画像がPNGではありません。透過処理のためPNG出力が必要です。',
        502,
      );
    }

    return {
      bytes,
      mimeType: 'image/png',
    };
  }

  const payload: unknown = await response.json();
  const imageBase64 = extractImageFromCloudflareJson(payload);

  if (!imageBase64) {
    throw new FunctionError('Cloudflare応答に生成画像が含まれていません。', 502);
  }

  const bytes = base64ToBytes(imageBase64);

  if (!pngBytes(bytes)) {
    throw new FunctionError(
      'Cloudflare生成画像がPNGではありません。透過処理のためPNG出力が必要です。',
      502,
    );
  }

  return {
    bytes,
    mimeType: 'image/png',
  };
}

function thumbnailPath(candidateId: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `thumbnails/${date}/${candidateId}-${crypto.randomUUID()}.png`;
}

async function uploadThumbnail({
  req,
  path,
  bytes,
  mimeType,
}: {
  req: Request;
  path: string;
  bytes: Uint8Array;
  mimeType: string;
}) {
  const authorization = req.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    throw new FunctionError('ログインが必要です。', 401);
  }

  const supabase = createAuthedSupabaseClient(authorization);
  const blobPart = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  const { error } = await supabase.storage
    .from(INVENTORY_THUMBNAILS_BUCKET)
    .upload(path, new Blob([blobPart], { type: mimeType }), {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new FunctionError(
      `生成サムネイルのStorage保存に失敗しました。${error.message}`,
      502,
    );
  }

  const { data } = supabase.storage
    .from(INVENTORY_THUMBNAILS_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
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

    const input = normalizeInput((await req.json()) as RequestBody);
    const sourceImage = await downloadSourceImage({
      req,
      bucket: input.source.bucket,
      path: input.source.path,
    });
    const preparedSourceImage = preprocessSourceImageForGeneration(
      sourceImage.bytes,
    );
    const generated = await callCloudflareImageGeneration({
      prompt: input.prompt,
      sourceBase64: preparedSourceImage.base64,
    });
    const thumbnail = postprocessGeneratedThumbnail(generated.bytes);
    const path = thumbnailPath(input.candidateId);
    const url = await uploadThumbnail({
      req,
      path,
      bytes: thumbnail.bytes,
      mimeType: thumbnail.mimeType,
    });

    return jsonResponse({
      thumbnail: {
        url,
        path,
        provider: 'cloudflare-workers-ai',
        prompt: input.prompt,
        preprocessed: preparedSourceImage.applied,
        postprocessed: thumbnail.applied,
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError || error instanceof FunctionError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    return jsonResponse({ error: 'サムネイル生成に失敗しました。' }, 500);
  }
});
