import type { InventoryItemFormValues } from '../inventoryForm';
import type { AiInventoryCandidate } from './types';
import { previewAiCandidateFormValues } from './aiCandidateNormalization';

export function applyAiCandidateToFormValues(
  currentValues: InventoryItemFormValues,
  candidate: AiInventoryCandidate,
): InventoryItemFormValues {
  return previewAiCandidateFormValues({
    currentValues,
    candidate,
  }).values;
}
