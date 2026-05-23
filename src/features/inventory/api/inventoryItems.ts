import { supabase } from '../../../lib/supabase/client';
import { ensureSupabaseConfig, toErrorMessage } from '../../../lib/supabase/errors';
import type { Database } from '../../../types/database';
import type { InventoryItem, InventoryItemType } from '../../../types/inventory';

export const inventoryItemTypes: InventoryItemType[] = [
  'alcohol',
  'drink',
  'mixer',
  'other',
];

export type InventoryItemInsert =
  Database['public']['Tables']['inventory_items']['Insert'];
export type InventoryItemUpdate =
  Database['public']['Tables']['inventory_items']['Update'];

function throwIfError(error: unknown) {
  if (error) {
    throw new Error(toErrorMessage(error));
  }
}

export async function listInventoryItems() {
  ensureSupabaseConfig();

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  throwIfError(error);
  return data ?? [];
}

export async function getInventoryItemById(id: string) {
  ensureSupabaseConfig();

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  throwIfError(error);
  return data;
}

export async function createInventoryItem(values: InventoryItemInsert) {
  ensureSupabaseConfig();

  const { data, error } = await supabase
    .from('inventory_items')
    .insert(values)
    .select('*')
    .single();

  throwIfError(error);
  return data;
}

export async function updateInventoryItem(
  id: string,
  values: InventoryItemUpdate,
) {
  ensureSupabaseConfig();

  const { data, error } = await supabase
    .from('inventory_items')
    .update(values)
    .eq('id', id)
    .select('*')
    .single();

  throwIfError(error);
  return data;
}

export async function deleteInventoryItem(id: string) {
  ensureSupabaseConfig();

  const { error } = await supabase.from('inventory_items').delete().eq('id', id);
  throwIfError(error);
}

export function calculateRemainingMl(
  volumeMl: number | null,
  ratio: number,
) {
  if (ratio === 0) {
    return 0;
  }

  if (volumeMl === null || Number.isNaN(volumeMl)) {
    return null;
  }

  return Math.max(0, Math.round(volumeMl * ratio));
}

export function sortInventoryItems(items: InventoryItem[]) {
  return [...items].sort((a, b) => {
    const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}
