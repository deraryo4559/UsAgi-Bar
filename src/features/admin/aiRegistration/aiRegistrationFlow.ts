import {
  emptyInventoryItemFormValues,
  type InventoryItemFormValues,
} from '../inventoryForm';
import {
  normalizeAiCandidate,
  type CategoryReferenceData,
} from './aiCandidateNormalization';
import type {
  AiInventoryAnalysisResult,
  AiInventoryCandidate,
  GeneratedInventoryThumbnail,
} from './types';
import { resolveInventoryThumbnailPrompt } from './thumbnailPrompt';

export type AiRegistrationStep =
  | 'idle'
  | 'uploading'
  | 'detecting'
  | 'cropping'
  | 'analyzing'
  | 'thumbnailing'
  | 'normalizing'
  | 'review'
  | 'saving'
  | 'done'
  | 'error';

export type EditableAiCandidateStatus = 'ready' | 'saving' | 'saved' | 'error';

export type EditableAiCandidate = {
  localId: string;
  sourceLabel: string;
  imageUrl: string;
  imagePath: string;
  detectionId: string | null;
  candidate: AiInventoryCandidate;
  values: InventoryItemFormValues;
  selected: boolean;
  status: EditableAiCandidateStatus;
  error: string | null;
};

export type CandidateRegistrationInput = {
  localId: string;
  values: InventoryItemFormValues;
};

export type CandidateRegistrationResult = {
  localId: string;
  ok: boolean;
  error: string | null;
};

export function getAiRegistrationStepMessage(step: AiRegistrationStep) {
  switch (step) {
    case 'idle':
      return '画像を選ぶと、候補作成まで自動で進みます。';
    case 'uploading':
      return '画像を保存しています。';
    case 'detecting':
      return '端末内でお酒・ドリンク候補を探しています。';
    case 'cropping':
      return '見つかった候補を切り抜いています。';
    case 'analyzing':
      return '候補をGemini Visionで解析しています。';
    case 'thumbnailing':
      return '酒棚用のイラストサムネイルを作っています。';
    case 'normalizing':
      return '登録候補を整理しています。';
    case 'review':
      return '候補を確認・修正してから登録してください。';
    case 'saving':
      return '選択した候補を登録しています。';
    case 'done':
      return '登録しました。';
    case 'error':
      return '画像から候補を作れませんでした。別の画像を試すか、手入力で登録してください。';
  }
}

export function shouldFallbackToWholeImage(
  detections: readonly unknown[] | null | undefined,
) {
  return !detections || detections.length === 0;
}

function withCandidateImage(
  values: InventoryItemFormValues,
  imageUrl: string,
  thumbnailPrompt: string,
): InventoryItemFormValues {
  return {
    ...values,
    image_url: imageUrl,
    thumbnail_prompt: thumbnailPrompt,
  };
}

export function createEditableCandidatesFromAnalysis({
  result,
  imageUrl,
  imagePath,
  sourceLabel,
  detectionId = null,
  referenceData,
}: {
  result: AiInventoryAnalysisResult;
  imageUrl: string;
  imagePath: string;
  sourceLabel: string;
  detectionId?: string | null;
  referenceData: CategoryReferenceData;
}): EditableAiCandidate[] {
  return result.candidates.map((candidate, index) => {
    const normalized = normalizeAiCandidate({
      candidate,
      currentValues: emptyInventoryItemFormValues,
      referenceData,
    });
    const localId = [
      detectionId ?? 'whole-image',
      candidate.candidate_id || `candidate-${index + 1}`,
      index,
    ].join(':');

    return {
      localId,
      sourceLabel,
      imageUrl,
      imagePath,
      detectionId,
      candidate: normalized.candidate,
      values: withCandidateImage(
        normalized.formValuesPreview,
        imageUrl,
        resolveInventoryThumbnailPrompt(normalized.candidate),
      ),
      selected: true,
      status: 'ready',
      error: null,
    };
  });
}

export function updateEditableCandidateValue<K extends keyof InventoryItemFormValues>(
  candidates: EditableAiCandidate[],
  localId: string,
  key: K,
  value: InventoryItemFormValues[K],
) {
  return candidates.map((candidate) =>
    candidate.localId === localId
      ? {
          ...candidate,
          values: {
            ...candidate.values,
            [key]: value,
          },
        }
      : candidate,
  );
}

export function applyGeneratedThumbnailToCandidates(
  candidates: EditableAiCandidate[],
  localId: string,
  thumbnail: GeneratedInventoryThumbnail,
  generatedAt: string,
) {
  return candidates.map((candidate) =>
    candidate.localId === localId
      ? {
          ...candidate,
          values: {
            ...candidate.values,
            thumbnail_url: thumbnail.url,
            thumbnail_prompt: thumbnail.prompt,
            thumbnail_provider: thumbnail.provider,
            thumbnail_generated_at: generatedAt,
          },
        }
      : candidate,
  );
}

export function setEditableCandidateSelected(
  candidates: EditableAiCandidate[],
  localId: string,
  selected: boolean,
) {
  return candidates.map((candidate) =>
    candidate.localId === localId ? { ...candidate, selected } : candidate,
  );
}

export function setAllEditableCandidatesSelected(
  candidates: EditableAiCandidate[],
  selected: boolean,
) {
  return candidates.map((candidate) => ({ ...candidate, selected }));
}

export function removeEditableCandidate(
  candidates: EditableAiCandidate[],
  localId: string,
) {
  return candidates.filter((candidate) => candidate.localId !== localId);
}

export function getSelectedRegistrationInputs(
  candidates: EditableAiCandidate[],
): CandidateRegistrationInput[] {
  return candidates
    .filter((candidate) => candidate.selected && candidate.status !== 'saved')
    .map((candidate) => ({
      localId: candidate.localId,
      values: candidate.values,
    }));
}

export function applyCandidateRegistrationResults(
  candidates: EditableAiCandidate[],
  results: CandidateRegistrationResult[],
) {
  const resultById = new Map(results.map((result) => [result.localId, result]));
  const failedCandidates = candidates
    .map((candidate) => {
      const result = resultById.get(candidate.localId);

      if (!result) {
        return candidate;
      }

      if (result.ok) {
        return {
          ...candidate,
          selected: false,
          status: 'saved' as const,
          error: null,
        };
      }

      return {
        ...candidate,
        selected: true,
        status: 'error' as const,
        error: result.error ?? '登録に失敗しました。',
      };
    })
    .filter((candidate) => candidate.status !== 'saved');

  return failedCandidates;
}

export function summarizeRegistrationResults(
  results: CandidateRegistrationResult[],
) {
  const successCount = results.filter((result) => result.ok).length;
  const failureCount = results.length - successCount;

  return { successCount, failureCount };
}
