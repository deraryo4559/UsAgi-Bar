export type InventoryItemType = 'alcohol' | 'drink' | 'mixer' | 'other';

export type InventoryItem = {
  id: string;
  name: string;
  item_type: InventoryItemType;
  category: string | null;
  sub_category: string | null;
  alcohol_percentage: number | null;
  volume_ml: number | null;
  remaining_ml: number | null;
  image_url: string | null;
  memo: string | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
};
