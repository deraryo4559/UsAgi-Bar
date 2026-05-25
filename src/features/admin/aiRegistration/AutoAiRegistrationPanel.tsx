import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { INVENTORY_IMAGES_BUCKET } from '../../../lib/supabase/config';
import { toErrorMessage } from '../../../lib/supabase/errors';
import { inventoryItemTypes } from '../../inventory/api/inventoryItems';
import { uploadInventoryImage } from '../../inventory/api/storage';
import type { InventoryItem, InventoryItemType } from '../../../types/inventory';
import { cropImageByPixelBox } from './boundingBoxes';
import { createLocalDetectionDrafts } from '../localDetection/detectionUiMapper';
import { detectLocalInventoryItems } from '../localDetection/localObjectDetector';
import type {
  ImageSize,
  LocalDetection,
  LocalDetectionDebugInfo,
} from '../localDetection/types';
import {
  normalizeAiCandidate,
  type CategoryReferenceData,
} from './aiCandidateNormalization';
import { findSimilarInventoryItems } from './aiCandidateSimilarity';
import { AnalyzeFailedState } from './AnalyzeFailedState';
import { AnalyzeLoadingScreen } from './AnalyzeLoadingScreen';
import {
  applyCandidateRegistrationResults,
  applyGeneratedThumbnailToCandidates,
  createEditableCandidatesFromAnalysis,
  getAiRegistrationStepMessage,
  getSelectedRegistrationInputs,
  removeEditableCandidate,
  setAllEditableCandidatesSelected,
  setEditableCandidateSelected,
  shouldFallbackToWholeImage,
  summarizeRegistrationResults,
  updateEditableCandidateValue,
  type AiRegistrationStep,
  type CandidateRegistrationInput,
  type CandidateRegistrationResult,
  type EditableAiCandidate,
} from './aiRegistrationFlow';
import { analyzeInventoryImage, generateInventoryThumbnail } from './api';
import { isAiQuotaOrRateLimitError } from './aiRegistrationErrors';
import { getCandidateReviewReasons } from './aiRegistrationValidation';
import type { AiInventoryCandidate } from './types';

type UploadedImage = {
  publicUrl: string;
  path: string;
  localUrl: string | null;
};

type AutoAiRegistrationPanelProps = {
  referenceData: CategoryReferenceData;
  inventoryItems: InventoryItem[];
  currentItemId?: string | null;
  isRegistering: boolean;
  onRegisterCandidates: (
    candidates: CandidateRegistrationInput[],
  ) => Promise<CandidateRegistrationResult[]>;
  onManualMode: () => void;
  onEditSimilarItem?: (item: InventoryItem) => void;
};

type ThumbnailJobState = {
  status: 'idle' | 'generating' | 'error';
  error: string | null;
};

const inputClass =
  'rounded-xl border border-night-gold/30 bg-black/35 px-3 py-2 text-sm font-normal text-cream-50 shadow-chip placeholder:text-cream-200/35 focus:border-night-neon focus:outline-none focus:ring-2 focus:ring-night-neon/25';

const processingSteps: AiRegistrationStep[] = [
  'uploading',
  'detecting',
  'cropping',
  'analyzing',
  'thumbnailing',
  'normalizing',
  'saving',
];

const fallbackThumbnailPrompt =
  'A clean cute 2D/3D hybrid illustrated thumbnail of a drink bottle for a cozy night bar app, full container visible, centered object, large in frame, crisp silhouette, no readable text, no exact brand logo, plain pure white or transparent background.';

const fieldLabels = {
  name: '商品名',
  item_type: '種別',
  category: 'category（標準材料名）',
  sub_category: 'sub_category',
  alcohol_percentage: '度数 (%)',
  volume_ml: '容量 ml',
  remaining_ml: '残量 ml',
  memo: 'memo',
} as const;

function todayPathSegment() {
  return new Date().toISOString().slice(0, 10);
}

function numberOrNull(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function candidateFromEditable(candidate: EditableAiCandidate): AiInventoryCandidate {
  return {
    ...candidate.candidate,
    name: candidate.values.name.trim() || null,
    item_type: candidate.values.item_type,
    category: candidate.values.category.trim() || null,
    sub_category: candidate.values.sub_category.trim() || null,
    alcohol_percentage: numberOrNull(candidate.values.alcohol_percentage),
    volume_ml: numberOrNull(candidate.values.volume_ml),
    remaining_ml: numberOrNull(candidate.values.remaining_ml),
    memo: candidate.values.memo.trim() || null,
  };
}

function sourceBadgeLabel(candidate: EditableAiCandidate) {
  if (candidate.detectionId) {
    return `${candidate.sourceLabel} / crop`;
  }

  return '画像全体';
}

function sourceImageUrl(uploadedImage: UploadedImage) {
  return uploadedImage.localUrl ?? uploadedImage.publicUrl;
}

function boxToStyle(detection: LocalDetection, imageSize: ImageSize | null) {
  if (!imageSize) {
    return null;
  }

  return {
    left: `${(detection.box.xmin / imageSize.width) * 100}%`,
    top: `${(detection.box.ymin / imageSize.height) * 100}%`,
    width: `${((detection.box.xmax - detection.box.xmin) / imageSize.width) * 100}%`,
    height: `${((detection.box.ymax - detection.box.ymin) / imageSize.height) * 100}%`,
  };
}

function isProcessingStep(step: AiRegistrationStep) {
  return processingSteps.includes(step);
}

export function AutoAiRegistrationPanel({
  referenceData,
  inventoryItems,
  currentItemId,
  isRegistering,
  onRegisterCandidates,
  onManualMode,
  onEditSimilarItem,
}: AutoAiRegistrationPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [step, setStep] = useState<AiRegistrationStep>('idle');
  const [originalImage, setOriginalImage] = useState<UploadedImage | null>(null);
  const [detections, setDetections] = useState<LocalDetection[]>([]);
  const [detectionImageSize, setDetectionImageSize] = useState<ImageSize | null>(
    null,
  );
  const [detectionDebug, setDetectionDebug] =
    useState<LocalDetectionDebugInfo | null>(null);
  const [candidates, setCandidates] = useState<EditableAiCandidate[]>([]);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [noticeText, setNoticeText] = useState<string | null>(null);
  const [technicalNoticeText, setTechnicalNoticeText] = useState<string | null>(
    null,
  );
  const [errorText, setErrorText] = useState<string | null>(null);
  const [registrationText, setRegistrationText] = useState<string | null>(null);
  const [thumbnailJobs, setThumbnailJobs] = useState<
    Record<string, ThumbnailJobState>
  >({});

  const selectedCount = useMemo(
    () => getSelectedRegistrationInputs(candidates).length,
    [candidates],
  );

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  async function analyzeWholeImage(
    uploadedImage: UploadedImage,
    sourceLabel = '画像全体',
  ) {
    setStep('analyzing');
    setStatusText('画像全体を1件の候補として解析しています。');
    const analysis = await analyzeInventoryImage({
      bucket: INVENTORY_IMAGES_BUCKET,
      path: uploadedImage.path,
    });

    return createEditableCandidatesFromAnalysis({
      result: analysis,
      imageUrl: uploadedImage.publicUrl,
      imagePath: uploadedImage.path,
      sourceLabel,
      referenceData,
    });
  }

  async function analyzeDetectedItems(
    uploadedImage: UploadedImage,
    nextDetections: LocalDetection[],
  ) {
    const drafts = createLocalDetectionDrafts(nextDetections);
    const nextCandidates: EditableAiCandidate[] = [];
    const cropErrors: string[] = [];

    setStep('cropping');
    setStatusText(`${drafts.length}件の候補を切り抜いています。`);

    for (const [index, draft] of drafts.entries()) {
      try {
        const cropFile = await cropImageByPixelBox({
          imageUrl: sourceImageUrl(uploadedImage),
          box: {
            x: draft.box.xmin,
            y: draft.box.ymin,
            width: draft.box.xmax - draft.box.xmin,
            height: draft.box.ymax - draft.box.ymin,
          },
          fileName: `${draft.detectionId}-${Date.now()}.png`,
        });
        const cropImage = await uploadInventoryImage(cropFile, {
          pathPrefix: `inventory/crops/${todayPathSegment()}`,
          fileNameBase: draft.detectionId,
        });

        setStep('analyzing');
        setStatusText(
          `${index + 1}/${drafts.length}件目の候補を解析しています。`,
        );
        const analysis = await analyzeInventoryImage({
          bucket: INVENTORY_IMAGES_BUCKET,
          path: cropImage.path,
        });
        nextCandidates.push(
          ...createEditableCandidatesFromAnalysis({
            result: analysis,
            imageUrl: cropImage.publicUrl,
            imagePath: cropImage.path,
            sourceLabel: draft.label,
            detectionId: draft.detectionId,
            referenceData,
          }),
        );
      } catch (error) {
        if (isAiQuotaOrRateLimitError(error)) {
          throw error;
        }

        cropErrors.push(`${draft.label}: ${toErrorMessage(error)}`);
      }
    }

    return {
      candidates: nextCandidates,
      notice:
        cropErrors.length > 0
          ? `一部の切り抜き候補は解析できませんでしたが、作成できた候補を表示しています。詳細: ${cropErrors
              .slice(0, 2)
              .join(' / ')}`
          : null,
    };
  }

  async function generateThumbnailsForCandidates(
    nextCandidates: EditableAiCandidate[],
  ) {
    if (nextCandidates.length === 0) {
      return {
        candidatesWithThumbnails: nextCandidates,
        notice: null,
      };
    }

    setStep('thumbnailing');

    const updatedCandidates: EditableAiCandidate[] = [];
    const nextThumbnailJobs: Record<string, ThumbnailJobState> = {};
    const thumbnailErrors: string[] = [];
    let quotaOrRateLimited = false;

    for (const [index, candidate] of nextCandidates.entries()) {
      setStatusText(
        `${index + 1}/${nextCandidates.length}件目の酒棚サムネイルを作っています。`,
      );

      try {
        const prompt =
          candidate.values.thumbnail_prompt.trim() ||
          candidate.candidate.thumbnail_prompt?.trim() ||
          fallbackThumbnailPrompt;
        const result = await generateInventoryThumbnail({
          source: {
            bucket: INVENTORY_IMAGES_BUCKET,
            path: candidate.imagePath,
          },
          prompt,
          candidateId: candidate.localId,
        });
        const generatedAt = new Date().toISOString();
        const [candidateWithThumbnail] = applyGeneratedThumbnailToCandidates(
          [candidate],
          candidate.localId,
          result.thumbnail,
          generatedAt,
        );

        updatedCandidates.push(candidateWithThumbnail);
        nextThumbnailJobs[candidate.localId] = { status: 'idle', error: null };
      } catch (error) {
        const message = toErrorMessage(error);
        updatedCandidates.push(candidate);
        nextThumbnailJobs[candidate.localId] = {
          status: 'error',
          error: message,
        };
        thumbnailErrors.push(`${candidate.values.name || candidate.sourceLabel}: ${message}`);

        if (isAiQuotaOrRateLimitError(error)) {
          quotaOrRateLimited = true;
          updatedCandidates.push(...nextCandidates.slice(index + 1));
          break;
        }
      }
    }

    setThumbnailJobs(nextThumbnailJobs);

    if (thumbnailErrors.length === 0) {
      return {
        candidatesWithThumbnails: updatedCandidates,
        notice: null,
      };
    }

    return {
      candidatesWithThumbnails: updatedCandidates,
      notice: quotaOrRateLimited
        ? 'サムネイル自動生成はAI APIの上限に達したため途中で止めました。候補登録は元画像のまま続けられます。'
        : `一部のサムネイル自動生成に失敗しました。候補登録は元画像のまま続けられます。詳細: ${thumbnailErrors
            .slice(0, 2)
            .join(' / ')}`,
    };
  }

  async function runAutoAnalysis(uploadedImage: UploadedImage) {
    setCandidates([]);
    setDetections([]);
    setDetectionImageSize(null);
    setDetectionDebug(null);
    setRegistrationText(null);
    setNoticeText(null);
    setTechnicalNoticeText(null);
    setErrorText(null);
    setThumbnailJobs({});

    try {
      setStep('detecting');
      setStatusText(
        '端末内でお酒・ドリンク候補を探しています。Geminiは使っていません。',
      );
      let detectedItems: LocalDetection[] = [];
      let fallbackNotice: string | null = null;

      const detectionResult = await detectLocalInventoryItems({
        imageUrl: sourceImageUrl(uploadedImage),
      });
      detectedItems = detectionResult.detections;
      setDetections(detectedItems);
      setDetectionImageSize(detectionResult.imageSize ?? null);
      setDetectionDebug(detectionResult.debug ?? null);
      setTechnicalNoticeText(detectionResult.warnings[0] ?? null);

      let nextCandidates: EditableAiCandidate[] = [];

      if (shouldFallbackToWholeImage(detectedItems)) {
        nextCandidates = await analyzeWholeImage(uploadedImage);
      } else {
        const detectedAnalysis = await analyzeDetectedItems(
          uploadedImage,
          detectedItems,
        );
        nextCandidates = detectedAnalysis.candidates;
        fallbackNotice = detectedAnalysis.notice;

        if (nextCandidates.length === 0) {
          fallbackNotice =
            '切り抜き解析で候補を作れなかったため、画像全体から候補を作成しました。';
          nextCandidates = await analyzeWholeImage(uploadedImage);
        }
      }

      const thumbnailResult = await generateThumbnailsForCandidates(
        nextCandidates,
      );

      setStep('normalizing');
      setStatusText('登録候補を整理しています。');
      setCandidates(thumbnailResult.candidatesWithThumbnails);
      setStep('review');
      setStatusText(
        `${thumbnailResult.candidatesWithThumbnails.length}件の候補を確認できます。`,
      );
      setNoticeText(
        [fallbackNotice, thumbnailResult.notice].filter(Boolean).join('\n') ||
          null,
      );
    } catch (error) {
      setStep('error');
      setErrorText(toErrorMessage(error));
      setStatusText(null);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!file) {
      return;
    }

    setStep('uploading');
    setStatusText('画像をStorageへ保存しています。');
    setNoticeText(null);
    setTechnicalNoticeText(null);
    setErrorText(null);
    setRegistrationText(null);
    setThumbnailJobs({});
    setCandidates([]);
    setDetections([]);
    setDetectionImageSize(null);
    setDetectionDebug(null);

    try {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const localUrl = URL.createObjectURL(file);
      objectUrlRef.current = localUrl;
      const uploadedImage = await uploadInventoryImage(file);
      const nextUploadedImage = {
        ...uploadedImage,
        localUrl,
      };
      setOriginalImage(nextUploadedImage);
      await runAutoAnalysis(nextUploadedImage);
    } catch (error) {
      setStep('error');
      setErrorText(toErrorMessage(error));
      setStatusText(null);
    }
  }

  function updateCandidate<K extends keyof EditableAiCandidate['values']>(
    localId: string,
    key: K,
    value: EditableAiCandidate['values'][K],
  ) {
    setCandidates((current) =>
      updateEditableCandidateValue(current, localId, key, value),
    );
  }

  async function handleGenerateThumbnail(candidate: EditableAiCandidate) {
    setThumbnailJobs((current) => ({
      ...current,
      [candidate.localId]: { status: 'generating', error: null },
    }));

    try {
      const prompt =
        candidate.values.thumbnail_prompt.trim() ||
        candidate.candidate.thumbnail_prompt?.trim() ||
        fallbackThumbnailPrompt;
      const result = await generateInventoryThumbnail({
        source: {
          bucket: INVENTORY_IMAGES_BUCKET,
          path: candidate.imagePath,
        },
        prompt,
        candidateId: candidate.localId,
      });

      setCandidates((current) =>
        applyGeneratedThumbnailToCandidates(
          current,
          candidate.localId,
          result.thumbnail,
          new Date().toISOString(),
        ),
      );
      setThumbnailJobs((current) => ({
        ...current,
        [candidate.localId]: { status: 'idle', error: null },
      }));
    } catch (error) {
      setThumbnailJobs((current) => ({
        ...current,
        [candidate.localId]: {
          status: 'error',
          error: toErrorMessage(error),
        },
      }));
    }
  }

  function handleUseOriginalImage(candidate: EditableAiCandidate) {
    setCandidates((current) =>
      current.map((item) =>
        item.localId === candidate.localId
          ? {
              ...item,
              values: {
                ...item.values,
                thumbnail_url: '',
                thumbnail_provider: '',
                thumbnail_generated_at: '',
              },
            }
          : item,
      ),
    );
    setThumbnailJobs((current) => ({
      ...current,
      [candidate.localId]: { status: 'idle', error: null },
    }));
  }

  async function handleRegisterSelected() {
    const selectedInputs = getSelectedRegistrationInputs(candidates);

    if (selectedInputs.length === 0) {
      setErrorText('登録対象の候補を選んでください。');
      return;
    }

    setStep('saving');
    setStatusText('選択した候補を登録しています。');
    setErrorText(null);
    setRegistrationText(null);
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.selected
          ? { ...candidate, status: 'saving', error: null }
          : candidate,
      ),
    );

    try {
      const results = await onRegisterCandidates(selectedInputs);
      const summary = summarizeRegistrationResults(results);
      setCandidates((current) =>
        applyCandidateRegistrationResults(current, results),
      );

      if (summary.failureCount > 0) {
        setStep('review');
        setRegistrationText(
          `${summary.successCount}件を登録しました。${summary.failureCount}件は失敗したため候補に残しています。`,
        );
        return;
      }

      setStep('done');
      setRegistrationText(`${summary.successCount}件を登録しました。`);
      setStatusText(null);
    } catch (error) {
      setStep('review');
      setErrorText(toErrorMessage(error));
    }
  }

  function renderCandidateForm(candidate: EditableAiCandidate, index: number) {
    const reviewCandidate = candidateFromEditable(candidate);
    const normalized = normalizeAiCandidate({
      candidate: reviewCandidate,
      currentValues: candidate.values,
      referenceData,
    });
    const similarInventoryItems = findSimilarInventoryItems({
      candidate: normalized.candidate,
      inventoryItems,
      referenceData,
      excludeItemId: currentItemId,
    }).slice(0, 2);
    const reviewReasons = [
      ...getCandidateReviewReasons(normalized.candidate, {
        kind: 'gemini_vision',
        image_path: candidate.imagePath,
      }),
      ...normalized.warnings.map((warning) => warning.message),
      ...similarInventoryItems.map(
        (match) =>
          `既存在庫「${match.item.name}」と似ています。必要なら既存アイテム更新を検討してください。`,
      ),
    ];
    const uniqueReviewReasons = [...new Set(reviewReasons)];
    const thumbnailJob = thumbnailJobs[candidate.localId] ?? {
      status: 'idle',
      error: null,
    };
    const previewImageUrl = candidate.values.thumbnail_url || candidate.imageUrl;

    return (
      <article
        key={candidate.localId}
        className="grid gap-4 rounded-2xl border border-night-gold/35 bg-night-ink/90 p-4 shadow-bar"
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-full border border-night-mint/45 bg-night-mint/10 px-3 py-1 text-xs font-bold text-night-mint">
              <input
                type="checkbox"
                checked={candidate.selected}
                onChange={(event) =>
                  setCandidates((current) =>
                    setEditableCandidateSelected(
                      current,
                      candidate.localId,
                      event.target.checked,
                    ),
                  )
                }
              />
              登録対象
            </label>
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent" size="sm">
                  候補 {index + 1}
                </Badge>
                <Badge tone="info" size="sm">
                  {sourceBadgeLabel(candidate)}
                </Badge>
                <Badge
                  tone={
                    normalized.categoryMatch.status === 'matched'
                      ? 'mint'
                      : 'warn'
                  }
                  size="sm"
                >
                  {normalized.categoryMatch.status === 'matched'
                    ? '照合OK'
                    : '要確認'}
                </Badge>
              </div>
              <h3 className="mt-1 truncate text-base font-extrabold text-cream-50">
                {candidate.values.name || '商品名未入力'}
              </h3>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setCandidates((current) =>
                removeEditableCandidate(current, candidate.localId),
              )
            }
          >
            候補を削除
          </Button>
        </header>

        <div className="grid gap-4 lg:grid-cols-[160px_1fr]">
          <div className="grid gap-2">
            <div className="rounded-2xl border border-night-gold/25 bg-black/35 p-3">
              <img
                className="mx-auto max-h-44 rounded-xl object-contain"
                src={previewImageUrl}
                alt={`${candidate.values.name || '候補'}の表示画像`}
                draggable={false}
              />
            </div>
            <div className="grid gap-2 rounded-2xl border border-night-gold/25 bg-black/25 p-3 text-xs text-cream-100/70">
              <div className="font-bold text-cream-50">
                酒棚サムネイル
              </div>
              {candidate.values.thumbnail_url ? (
                <div className="text-night-mint">
                  イラストサムネイルを使用します。
                </div>
              ) : thumbnailJob.error ? (
                <div className="text-night-glow">
                  自動生成に失敗しました。元画像のまま登録できます。
                </div>
              ) : (
                <div>
                  解析後に自動生成します。登録は元画像のままでも続けられます。
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={thumbnailJob.status === 'generating'}
                  onClick={() => void handleGenerateThumbnail(candidate)}
                >
                  {thumbnailJob.status === 'generating'
                    ? '生成中…'
                    : candidate.values.thumbnail_url || thumbnailJob.error
                      ? '再生成'
                      : 'サムネイルを作る'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!candidate.values.thumbnail_url}
                  onClick={() => handleUseOriginalImage(candidate)}
                >
                  元画像を使う
                </Button>
              </div>
              <details className="rounded-xl border border-night-gold/20 bg-black/20 p-2">
                <summary className="cursor-pointer font-bold text-cream-50">
                  生成prompt
                </summary>
                <textarea
                  className={`${inputClass} mt-2 min-h-24 w-full text-xs`}
                  value={candidate.values.thumbnail_prompt}
                  onChange={(event) =>
                    updateCandidate(
                      candidate.localId,
                      'thumbnail_prompt',
                      event.target.value,
                    )
                  }
                />
              </details>
              {thumbnailJob.error ? (
                <Alert tone="warn">
                  イラストサムネイルを作れませんでした。元画像のまま登録できます。
                  <span className="mt-1 block text-[11px] opacity-75">
                    {thumbnailJob.error}
                  </span>
                </Alert>
              ) : null}
            </div>
            {candidate.status === 'error' ? (
              <Alert tone="error">{candidate.error}</Alert>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              {fieldLabels.name}
              <input
                className={inputClass}
                required
                value={candidate.values.name}
                onChange={(event) =>
                  updateCandidate(candidate.localId, 'name', event.target.value)
                }
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {fieldLabels.item_type}
              <select
                className={inputClass}
                value={candidate.values.item_type}
                onChange={(event) =>
                  updateCandidate(
                    candidate.localId,
                    'item_type',
                    event.target.value as InventoryItemType,
                  )
                }
              >
                {inventoryItemTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {fieldLabels.category}
              <input
                className={inputClass}
                value={candidate.values.category}
                onChange={(event) =>
                  updateCandidate(
                    candidate.localId,
                    'category',
                    event.target.value,
                  )
                }
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {fieldLabels.sub_category}
              <input
                className={inputClass}
                value={candidate.values.sub_category}
                onChange={(event) =>
                  updateCandidate(
                    candidate.localId,
                    'sub_category',
                    event.target.value,
                  )
                }
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {fieldLabels.alcohol_percentage}
              <input
                className={inputClass}
                inputMode="decimal"
                min="0"
                max="100"
                type="number"
                value={candidate.values.alcohol_percentage}
                onChange={(event) =>
                  updateCandidate(
                    candidate.localId,
                    'alcohol_percentage',
                    event.target.value,
                  )
                }
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {fieldLabels.volume_ml}
              <input
                className={inputClass}
                inputMode="decimal"
                min="0"
                type="number"
                value={candidate.values.volume_ml}
                onChange={(event) =>
                  updateCandidate(
                    candidate.localId,
                    'volume_ml',
                    event.target.value,
                  )
                }
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {fieldLabels.remaining_ml}
              <input
                className={inputClass}
                inputMode="decimal"
                min="0"
                type="number"
                value={candidate.values.remaining_ml}
                onChange={(event) =>
                  updateCandidate(
                    candidate.localId,
                    'remaining_ml',
                    event.target.value,
                  )
                }
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
              {fieldLabels.memo}
              <textarea
                className={`${inputClass} min-h-20`}
                value={candidate.values.memo}
                onChange={(event) =>
                  updateCandidate(candidate.localId, 'memo', event.target.value)
                }
              />
            </label>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div
            className={`rounded-xl border px-3 py-2 text-xs ${
              normalized.categoryMatch.status === 'matched'
                ? 'border-night-mint/45 bg-night-mint/15 text-night-mint'
                : 'border-night-orange/45 bg-night-orange/15 text-night-glow'
            }`}
          >
            <div className="font-bold">カクテルDB照合</div>
            <div className="mt-0.5">{normalized.categoryMatch.message}</div>
          </div>

          {uniqueReviewReasons.length ? (
            <div className="rounded-xl border border-night-orange/40 bg-night-orange/15 p-3 text-xs text-night-glow">
              <div className="mb-1 font-bold">確認ポイント</div>
              <ul className="list-disc space-y-0.5 pl-5">
                {uniqueReviewReasons.slice(0, 5).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {similarInventoryItems.length ? (
          <div className="rounded-xl border border-night-neon/40 bg-night-neon/15 p-3 text-xs text-rose-100">
            <div className="font-bold">似ている在庫があります</div>
            <div className="mt-2 grid gap-2">
              {similarInventoryItems.map((match) => (
                <div
                  key={match.item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-night-neon/25 bg-black/30 p-2"
                >
                  <span>
                    {match.item.name} / {match.item.category ?? 'category未設定'}
                  </span>
                  {onEditSimilarItem ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onEditSimilarItem(match.item)}
                    >
                      この在庫を編集
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  function renderUploadStep() {
    return (
      <section className="grid gap-5 rounded-[28px] border border-night-gold/35 bg-[radial-gradient(circle_at_50%_0%,rgba(255,214,128,0.12),rgba(6,8,14,0.94)_58%)] p-5 shadow-bar">
        <div className="grid items-center gap-5 lg:grid-cols-[1fr_260px]">
          <div className="grid gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-night-glow">
                1 画像を添付
              </div>
              <h2 className="mt-1 text-2xl font-extrabold text-cream-50">
                商品画像を選ぶだけ
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-cream-100/70">
                画像保存、候補検出、切り抜き、AI判定まで自動で進めます。
                保存する前に必ず候補フォームで確認できます。
              </p>
            </div>

            <button
              type="button"
              className="group grid min-h-64 place-items-center rounded-[24px] border border-dashed border-night-neon/55 bg-black/30 p-6 text-center shadow-inner transition hover:border-night-neon hover:bg-night-neon/10"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="grid justify-items-center gap-3">
                <span className="flex h-16 w-16 items-center justify-center rounded-3xl border border-night-neon/60 bg-night-neon/15 text-4xl text-night-neon shadow-neon transition group-hover:scale-105">
                  ↑
                </span>
                <span className="text-lg font-extrabold text-cream-50">
                  ここに画像を添付
                </span>
                <span className="text-sm text-cream-100/65">
                  jpg / png / webp、2MB以下
                </span>
                <span className="rounded-full bg-night-neon px-5 py-2 text-sm font-bold text-white shadow-neon">
                  画像を選ぶ
                </span>
              </span>
            </button>
          </div>

          <div className="grid gap-3 rounded-3xl border border-night-gold/30 bg-black/35 p-4 text-sm text-cream-100/75 shadow-chip">
            {originalImage ? (
              <img
                src={sourceImageUrl(originalImage)}
                alt="前回の解析画像"
                className="mx-auto max-h-56 rounded-2xl object-contain"
                draggable={false}
              />
            ) : null}
            <div className="rounded-2xl border border-night-gold/25 bg-night-warm/50 p-3">
              <div className="font-bold text-night-glow">
                うさぎ店主のひとこと
              </div>
              <p className="mt-1">
                迷ったら写真を1枚選んでくれ。あとはこっちで候補まで持っていくぞ。
              </p>
            </div>
            <Button type="button" variant="ghost" onClick={onManualMode}>
              手入力で登録する
            </Button>
          </div>
        </div>
      </section>
    );
  }

  function renderDetectionDetails() {
    if (detections.length === 0 && !technicalNoticeText && !detectionDebug) {
      return null;
    }

    return (
      <details className="rounded-2xl border border-night-gold/25 bg-black/25 p-3 text-xs text-cream-100/75">
        <summary className="cursor-pointer font-bold text-cream-50">
          処理ログを見る ({detections.length}件)
        </summary>
        <div className="mt-3 grid gap-2">
          {originalImage && detections.length > 0 && detectionImageSize ? (
            <div className="grid gap-2 rounded-xl border border-night-gold/20 bg-black/25 p-3">
              <div className="font-bold text-cream-50">
                検出枠プレビュー
              </div>
              <div className="relative overflow-hidden rounded-xl border border-night-gold/20 bg-black/45">
                <img
                  className="block w-full select-none"
                  src={sourceImageUrl(originalImage)}
                  alt="検出対象画像"
                  draggable={false}
                />
                {detections.map((detection, index) => {
                  const style = boxToStyle(detection, detectionImageSize);

                  if (!style) {
                    return null;
                  }

                  return (
                    <div
                      key={detection.detectionId}
                      className="absolute border-2 border-night-mint bg-night-mint/10 shadow-neon"
                      style={style}
                    >
                      <span className="absolute left-0 top-0 rounded-br-lg bg-night-mint px-1.5 py-0.5 text-[10px] font-bold text-night-deep">
                        {index + 1} {detection.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {technicalNoticeText ? (
            <div className="rounded-xl border border-night-gold/20 bg-black/25 p-2 text-cream-200/65">
              {technicalNoticeText}
            </div>
          ) : null}
          {detectionDebug ? (
            <div className="rounded-xl border border-night-gold/20 bg-black/25 p-2 text-cream-200/65">
              <div className="font-bold text-cream-50">モデルdebug</div>
              <div className="mt-1 grid gap-1">
                <div>model: {detectionDebug.modelPath}</div>
                <div>classes: {detectionDebug.classesPath}</div>
                <div>wasm: {detectionDebug.runtimeWasmPath ?? '未設定'}</div>
                <div>input: [{detectionDebug.inputTensorShape.join(', ')}]</div>
                <div>
                  output: {detectionDebug.outputNames.join(', ')} / [
                  {detectionDebug.outputDims.join(', ')}]
                </div>
                <div>
                  raw {detectionDebug.rawDetectionsCount} / threshold{' '}
                  {detectionDebug.confidenceThresholdCount} / nms{' '}
                  {detectionDebug.nmsDetectionsCount} / excluded{' '}
                  {detectionDebug.excludedClassCount}
                </div>
              </div>
            </div>
          ) : null}
          {detections.map((detection) => (
            <div
              key={detection.detectionId}
              className="rounded-xl border border-night-gold/20 bg-black/25 p-2"
            >
              <div className="font-semibold">{detection.label}</div>
              <div className="mt-1 text-cream-200/60">
                {detection.kind} / confidence {detection.confidence.toFixed(2)} /
                box {JSON.stringify(detection.box)}
              </div>
            </div>
          ))}
        </div>
      </details>
    );
  }

  return (
    <Card className="grid gap-5">
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => void handleFileChange(event)}
      />

      {isProcessingStep(step) ? (
        <AnalyzeLoadingScreen
          step={step}
          statusText={statusText ?? getAiRegistrationStepMessage(step)}
          imageUrl={originalImage ? sourceImageUrl(originalImage) : null}
          onManualMode={onManualMode}
        />
      ) : null}

      {step === 'error' && errorText ? (
        <AnalyzeFailedState
          message={errorText}
          onChooseImage={() => fileInputRef.current?.click()}
          onManualMode={onManualMode}
          onRetry={() => {
            if (originalImage) {
              void runAutoAnalysis(originalImage);
            }
          }}
        />
      ) : null}

      {step === 'idle' ? renderUploadStep() : null}

      {candidates.length ? (
        <section className="grid gap-4">
          <div className="flex flex-col gap-3 rounded-[24px] border border-night-gold/35 bg-black/30 p-4 shadow-chip sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-night-glow">
                3 判定結果
              </div>
              <h3 className="mt-1 text-xl font-extrabold text-cream-50">
                候補を確認して登録
              </h3>
              <p className="mt-1 text-sm text-cream-100/65">
                選択中 {selectedCount} 件 / 候補 {candidates.length} 件
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setCandidates((current) =>
                    setAllEditableCandidatesSelected(current, true),
                  )
                }
              >
                全選択
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCandidates((current) =>
                    setAllEditableCandidatesSelected(current, false),
                  )
                }
              >
                全解除
              </Button>
              <Button
                type="button"
                variant="accent"
                disabled={
                  selectedCount === 0 ||
                  step === 'saving' ||
                  isRegistering
                }
                onClick={() => void handleRegisterSelected()}
              >
                {step === 'saving' || isRegistering
                  ? '登録中…'
                  : '登録する'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!originalImage || isRegistering}
                onClick={() => {
                  if (originalImage) {
                    void runAutoAnalysis(originalImage);
                  }
                }}
              >
                再解析
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onManualMode}
              >
                手入力
              </Button>
            </div>
          </div>
          {noticeText ? <Alert tone="info">{noticeText}</Alert> : null}
          {errorText ? <Alert tone="error">{errorText}</Alert> : null}
          {registrationText ? (
            <Alert tone={step === 'done' ? 'success' : 'warn'}>
              {registrationText}
            </Alert>
          ) : null}
          {candidates.map(renderCandidateForm)}
          {renderDetectionDetails()}
        </section>
      ) : null}

      {step === 'done' && candidates.length === 0 ? (
        <section className="grid gap-4 rounded-[24px] border border-night-mint/45 bg-night-mint/15 p-5 text-night-mint">
          <h3 className="text-lg font-extrabold">登録できたぞ</h3>
          {registrationText ? <p className="text-sm">{registrationText}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="accent"
              onClick={() => fileInputRef.current?.click()}
            >
              別の画像を選ぶ
            </Button>
            <Button type="button" variant="ghost" onClick={onManualMode}>
              手入力で登録する
            </Button>
          </div>
        </section>
      ) : null}
    </Card>
  );
}
