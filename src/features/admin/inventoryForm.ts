import type {
  InventoryItemInsert,
  InventoryItemUpdate,
} from '../inventory/api/inventoryItems';
import type { InventoryItem, InventoryItemType } from '../../types/inventory';

export type InventoryItemFormValues = {
  name: string;
  item_type: InventoryItemType;
  category: string;
  sub_category: string;
  alcohol_percentage: string;
  volume_ml: string;
  remaining_ml: string;
  image_url: string;
  thumbnail_url: string;
  thumbnail_prompt: string;
  thumbnail_provider: string;
  thumbnail_generated_at: string;
  memo: string;
  display_order: string;
};

export const emptyInventoryItemFormValues: InventoryItemFormValues = {
  name: '',
  item_type: 'alcohol',
  category: '',
  sub_category: '',
  alcohol_percentage: '',
  volume_ml: '',
  remaining_ml: '',
  image_url: '',
  thumbnail_url: '',
  thumbnail_prompt: '',
  thumbnail_provider: '',
  thumbnail_generated_at: '',
  memo: '',
  display_order: '',
};

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableInteger(value: string) {
  const parsed = nullableNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

function numberToFormValue(value: number | null) {
  return value === null ? '' : String(value);
}

export function inventoryItemToFormValues(
  item: InventoryItem,
): InventoryItemFormValues {
  return {
    name: item.name,
    item_type: item.item_type,
    category: item.category ?? '',
    sub_category: item.sub_category ?? '',
    alcohol_percentage: numberToFormValue(item.alcohol_percentage),
    volume_ml: numberToFormValue(item.volume_ml),
    remaining_ml: numberToFormValue(item.remaining_ml),
    image_url: item.image_url ?? '',
    thumbnail_url: item.thumbnail_url ?? '',
    thumbnail_prompt: item.thumbnail_prompt ?? '',
    thumbnail_provider: item.thumbnail_provider ?? '',
    thumbnail_generated_at: item.thumbnail_generated_at ?? '',
    memo: item.memo ?? '',
    display_order: numberToFormValue(item.display_order),
  };
}

export function formValuesToInventoryItemInput(
  values: InventoryItemFormValues,
): InventoryItemInsert {
  return {
    name: values.name.trim(),
    item_type: values.item_type,
    category: nullableText(values.category),
    sub_category: nullableText(values.sub_category),
    alcohol_percentage: nullableNumber(values.alcohol_percentage),
    volume_ml: nullableNumber(values.volume_ml),
    remaining_ml: nullableNumber(values.remaining_ml),
    image_url: nullableText(values.image_url),
    thumbnail_url: nullableText(values.thumbnail_url),
    thumbnail_prompt: nullableText(values.thumbnail_prompt),
    thumbnail_provider: nullableText(values.thumbnail_provider),
    thumbnail_generated_at: nullableText(values.thumbnail_generated_at),
    memo: nullableText(values.memo),
    display_order: nullableInteger(values.display_order),
  };
}

export function formValuesToInventoryItemUpdate(
  values: InventoryItemFormValues,
): InventoryItemUpdate {
  return formValuesToInventoryItemInput(values);
}
