export const INVENTORY_IMAGES_BUCKET = 'inventory-images';
export const MAX_UPLOAD_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export const SUPPORTED_INVENTORY_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
