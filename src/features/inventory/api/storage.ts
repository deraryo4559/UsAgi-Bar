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

export async function uploadInventoryImage(file: File) {
  ensureSupabaseConfig();
  validateInventoryImageFile(file);

  const extension = getFileExtension(file);
  const randomId =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const filePath = `inventory/${new Date().toISOString().slice(0, 10)}/${randomId}.${extension}`;

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

  return data.publicUrl;
}
