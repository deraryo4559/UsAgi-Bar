import type { DetectionBox2d } from './types';

export type ImageSize = {
  width: number;
  height: number;
};

export type PixelBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const BOX_MIN = 0;
const BOX_MAX = 1000;

function clamp(value: number, min = BOX_MIN, max = BOX_MAX) {
  return Math.min(max, Math.max(min, value));
}

function assertFiniteBox(box: DetectionBox2d) {
  const values = [box.xmin, box.ymin, box.xmax, box.ymax];

  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('検出枠の座標が数値ではありません。');
  }
}

export function clampBox(box: DetectionBox2d): DetectionBox2d {
  assertFiniteBox(box);

  return {
    xmin: clamp(box.xmin),
    ymin: clamp(box.ymin),
    xmax: clamp(box.xmax),
    ymax: clamp(box.ymax),
  };
}

export function isValidBox(box: DetectionBox2d) {
  const clamped = clampBox(box);
  return clamped.xmin < clamped.xmax && clamped.ymin < clamped.ymax;
}

export function normalizeBox(box: DetectionBox2d): DetectionBox2d {
  const clamped = clampBox(box);

  if (clamped.xmin >= clamped.xmax || clamped.ymin >= clamped.ymax) {
    throw new Error('検出枠は xmin < xmax かつ ymin < ymax にしてください。');
  }

  return clamped;
}

function assertImageSize(size: ImageSize) {
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    throw new Error('画像サイズが正しくありません。');
  }
}

export function scaleBoxToImage(
  box: DetectionBox2d,
  imageSize: ImageSize,
): PixelBox {
  assertImageSize(imageSize);
  const normalized = normalizeBox(box);

  return {
    x: Math.round((normalized.xmin / BOX_MAX) * imageSize.width),
    y: Math.round((normalized.ymin / BOX_MAX) * imageSize.height),
    width: Math.round(
      ((normalized.xmax - normalized.xmin) / BOX_MAX) * imageSize.width,
    ),
    height: Math.round(
      ((normalized.ymax - normalized.ymin) / BOX_MAX) * imageSize.height,
    ),
  };
}

export function scaleBoxToDisplay(
  box: DetectionBox2d,
  displaySize: ImageSize,
): PixelBox {
  return scaleBoxToImage(box, displaySize);
}

function loadImage(imageUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('切り抜き元画像を読み込めませんでした。'));
    image.src = imageUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality = 0.92) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvasから画像を作成できませんでした。'));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export async function cropImageByBox({
  imageUrl,
  box,
  fileName,
}: {
  imageUrl: string;
  box: DetectionBox2d;
  fileName: string;
}) {
  const image = await loadImage(imageUrl);
  const pixelBox = scaleBoxToImage(box, {
    width: image.naturalWidth,
    height: image.naturalHeight,
  });

  const canvas = document.createElement('canvas');
  canvas.width = pixelBox.width;
  canvas.height = pixelBox.height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvasを初期化できませんでした。');
  }

  context.drawImage(
    image,
    pixelBox.x,
    pixelBox.y,
    pixelBox.width,
    pixelBox.height,
    0,
    0,
    pixelBox.width,
    pixelBox.height,
  );

  const blob = await canvasToBlob(canvas, 'image/png');
  return new File([blob], fileName.endsWith('.png') ? fileName : `${fileName}.png`, {
    type: 'image/png',
  });
}

export async function cropImageByPixelBox({
  imageUrl,
  box,
  fileName,
}: {
  imageUrl: string;
  box: PixelBox;
  fileName: string;
}) {
  const image = await loadImage(imageUrl);
  const x = Math.max(0, Math.min(image.naturalWidth, Math.round(box.x)));
  const y = Math.max(0, Math.min(image.naturalHeight, Math.round(box.y)));
  const width = Math.max(
    1,
    Math.min(image.naturalWidth - x, Math.round(box.width)),
  );
  const height = Math.max(
    1,
    Math.min(image.naturalHeight - y, Math.round(box.height)),
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvasを初期化できませんでした。');
  }

  context.drawImage(image, x, y, width, height, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, 'image/png');
  return new File([blob], fileName.endsWith('.png') ? fileName : `${fileName}.png`, {
    type: 'image/png',
  });
}
