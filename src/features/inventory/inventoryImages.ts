import type { InventoryItem } from '../../types/inventory';

function cleanUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getInventoryDisplayImageUrl(item: InventoryItem) {
  return cleanUrl(item.thumbnail_url) ?? cleanUrl(item.image_url);
}

export function hasGeneratedThumbnail(item: InventoryItem) {
  return Boolean(cleanUrl(item.thumbnail_url));
}
