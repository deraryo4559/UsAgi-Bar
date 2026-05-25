import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase/client';
import { ensureSupabaseConfig } from '../../../lib/supabase/errors';
import { toAiRegistrationErrorMessage } from './aiRegistrationErrors';
import {
  validateAiInventoryAnalysisResult,
  validateAnalyzeInventoryImageInput,
  validateGenerateInventoryThumbnailInput,
  validateGenerateInventoryThumbnailResult,
} from './aiRegistrationValidation';
import type {
  AiInventoryAnalysisResult,
  AnalyzeInventoryImageInput,
  GenerateInventoryThumbnailInput,
  GenerateInventoryThumbnailResult,
} from './types';

async function readFunctionErrorDetail(error: unknown) {
  if (!(error instanceof FunctionsHttpError)) {
    return null;
  }

  try {
    const response = error.context.clone();
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as unknown;

      if (
        typeof payload === 'object' &&
        payload !== null &&
        'error' in payload &&
        typeof payload.error === 'string'
      ) {
        return payload.error;
      }
    }

    const text = await response.text();
    return text.trim() || null;
  } catch {
    return null;
  }
}

async function toFunctionErrorMessage(
  error: unknown,
  functionName: string,
) {
  const detail = await readFunctionErrorDetail(error);
  const errorForMessage = detail
    ? new Error(`${error instanceof Error ? error.message : 'Edge Function error'}: ${detail}`)
    : error;

  return toAiRegistrationErrorMessage(errorForMessage, functionName);
}

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
    throw new Error(await toFunctionErrorMessage(error, 'analyze-inventory-image'));
  }

  try {
    return validateAiInventoryAnalysisResult(data);
  } catch (validationError) {
    throw new Error(
      toAiRegistrationErrorMessage(
        validationError,
        'analyze-inventory-image',
      ),
    );
  }
}

export async function generateInventoryThumbnail(
  input: GenerateInventoryThumbnailInput,
): Promise<GenerateInventoryThumbnailResult> {
  ensureSupabaseConfig();

  const thumbnailInput = validateGenerateInventoryThumbnailInput(input);

  const { data, error } = await supabase.functions.invoke(
    'generate-inventory-thumbnail',
    {
      body: thumbnailInput,
    },
  );

  if (error) {
    throw new Error(
      await toFunctionErrorMessage(error, 'generate-inventory-thumbnail'),
    );
  }

  try {
    return validateGenerateInventoryThumbnailResult(data);
  } catch (validationError) {
    throw new Error(
      toAiRegistrationErrorMessage(
        validationError,
        'generate-inventory-thumbnail',
      ),
    );
  }
}
