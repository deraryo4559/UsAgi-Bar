import { supabase } from '../../../lib/supabase/client';
import { ensureSupabaseConfig } from '../../../lib/supabase/errors';
import { toAiRegistrationErrorMessage } from './aiRegistrationErrors';
import {
  validateAiInventoryAnalysisResult,
  validateAnalyzeInventoryImageInput,
} from './aiRegistrationValidation';
import type {
  AiInventoryAnalysisResult,
  AnalyzeInventoryImageInput,
} from './types';

export async function analyzeInventoryImage(
  input: AnalyzeInventoryImageInput,
): Promise<AiInventoryAnalysisResult> {
  ensureSupabaseConfig();

  const storageImage = validateAnalyzeInventoryImageInput(input);

  const { data, error } = await supabase.functions.invoke(
    'analyze-inventory-image',
    {
      body: storageImage,
    },
  );

  if (error) {
    throw new Error(toAiRegistrationErrorMessage(error));
  }

  try {
    return validateAiInventoryAnalysisResult(data);
  } catch (validationError) {
    throw new Error(toAiRegistrationErrorMessage(validationError));
  }
}
