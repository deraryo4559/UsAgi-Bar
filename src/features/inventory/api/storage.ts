import { supabase } from '../../../lib/supabase/client';
import {
  INVENTORY_IMAGES_BUCKET,
  MAX_UPLOAD_IMAGE_SIZE_BYTES,
  SUPPORTED_INVENTORY_IMAGE_TYPES,
} from '../../../lib/supabase/config';
import { ensureSupabaseConfig, toErrorMessage } from '../../../lib/supabase/errors';

function getFileExtension(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension) {
    return extension === 'jpeg' ? 'jpg' : extension;
  }

  if (file.type === 'image/png') {
    return 'png';
  }

  if (file.type === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

export type UploadedInventoryImage = {
  publicUrl: string;
  path: string;
};

type UploadInventoryImageOptions = {
  pathPrefix?: string;
  fileNameBase?: string;
};

export function validateInventoryImageFile(file: File) {
  if (
    !SUPPORTED_INVENTORY_IMAGE_TYPES.includes(
      file.type as (typeof SUPPORTED_INVENTORY_IMAGE_TYPES)[number],
    )
  ) {
    throw new Error('画像形式は jpg / jpeg / png / webp のみ対応しています。');
  }

  if (file.size > MAX_UPLOAD_IMAGE_SIZE_BYTES) {
    throw new Error('画像サイズは2MB以下にしてください。');
  }
}

export function extractInventoryImagePathFromPublicUrl(publicUrl: string) {
  const trimmedUrl = publicUrl.trim();

  if (!trimmedUrl) {
    return null;
  }

  try {
    const parsed = new URL(trimmedUrl);
    const marker = `/storage/v1/object/public/${INVENTORY_IMAGES_BUCKET}/`;
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const path = decodeURIComponent(
      parsed.pathname.slice(markerIndex + marker.length),
    );

    return path.startsWith('inventory/') ? path : null;
  } catch {
    return null;
  }
}

export async function uploadInventoryImage(
  file: File,
  options: UploadInventoryImageOptions = {},
): Promise<UploadedInventoryImage> {
  ensureSupabaseConfig();
  validateInventoryImageFile(file);

  const extension = getFileExtension(file);
  const randomId =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const safeFileNameBase = options.fileNameBase
    ?.replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const pathPrefix =
    options.pathPrefix?.trim() ||
    `inventory/${new Date().toISOString().slice(0, 10)}`;

  if (
    !pathPrefix.startsWith('inventory/') ||
    pathPrefix.includes('..') ||
    pathPrefix.includes('\\') ||
    pathPrefix.endsWith('/')
  ) {
    throw new Error('画像アップロード先pathの形式が正しくありません。');
  }

  const fileName = safeFileNameBase ? `${safeFileNameBase}-${randomId}` : randomId;
  const filePath = `${pathPrefix}/${fileName}.${extension}`;

  const { error } = await supabase.storage
    .from(INVENTORY_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`画像アップロードに失敗しました。${toErrorMessage(error)}`);
  }

  const { data } = supabase.storage
    .from(INVENTORY_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  return {
    publicUrl: data.publicUrl,
    path: filePath,
  };
}
