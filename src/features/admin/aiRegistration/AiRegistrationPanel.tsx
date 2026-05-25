import { useEffect, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { INVENTORY_IMAGES_BUCKET } from '../../../lib/supabase/config';
import type { InventoryItem } from '../../../types/inventory';
import type { InventoryItemFormValues } from '../inventoryForm';
import { analyzeInventoryImage } from './api';
import { AiCandidateCard } from './AiCandidateCard';
import type { CategoryReferenceData } from './aiCandidateNormalization';
import { toAiRegistrationErrorMessage } from './aiRegistrationErrors';
import type { AiInventoryAnalysisResult, AiInventoryCandidate } from './types';

type AiRegistrationPanelProps = {
  currentValues: InventoryItemFormValues;
  imageFile: File | null;
  imagePath: string | null;
  imageUrl: string;
  referenceData: CategoryReferenceData;
  inventoryItems: InventoryItem[];
  currentItemId?: string | null;
  onApplyCandidate: (candidate: AiInventoryCandidate) => void;
  onEditSimilarItem?: (item: InventoryItem) => void;
};

export function AiRegistrationPanel({
  currentValues,
  imageFile,
  imagePath,
  imageUrl,
  referenceData,
  inventoryItems,
  currentItemId,
  onApplyCandidate,
  onEditSimilarItem,
}: AiRegistrationPanelProps) {
  const [imageAnalysisResult, setImageAnalysisResult] =
    useState<AiInventoryAnalysisResult | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisError, setImageAnalysisError] = useState<string | null>(
    null,
  );
  const canAnalyzeImage = Boolean(imagePath) && !imageFile && !isAnalyzingImage;

  useEffect(() => {
    setImageAnalysisResult(null);
    setImageAnalysisError(null);
  }, [imagePath]);

  async function handleAnalyzeImage() {
    if (!imagePath) {
      setImageAnalysisError(
        'Gemini Visionを使うには、先に画像をStorageへアップロードしてください。',
      );
      return;
    }

    if (imageFile) {
      setImageAnalysisError(
        '選択中の画像を先にアップロードしてください。Gemini VisionはStorage内画像だけを解析します。',
      );
      return;
    }

    setIsAnalyzingImage(true);
    setImageAnalysisError(null);
    setImageAnalysisResult(null);

    try {
      const result = await analyzeInventoryImage({
        bucket: INVENTORY_IMAGES_BUCKET,
        path: imagePath,
      });
      setImageAnalysisResult(result);
    } catch (nextError) {
      setImageAnalysisError(toAiRegistrationErrorMessage(nextError));
    } finally {
      setIsAnalyzingImage(false);
    }
  }

  const hint = imageFile
    ? '選択中の画像を先にアップロードしてください。'
    : imagePath
      ? `${INVENTORY_IMAGES_BUCKET}/${imagePath} を解析します。`
      : imageUrl
        ? '画像URLからStorage pathを取得できません。画像を再アップロードしてください。'
        : '画像アップロード後に実行できます。';

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 rounded-xl border border-night-gold/35 bg-night-accent/45 p-4">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-night-gold text-[10px] font-bold text-night-deep">
              2A
            </span>
            <h3 className="text-sm font-bold text-cream-50">
              単体画像からAI候補作成
            </h3>
            <Badge tone="accent" size="sm">
              Gemini Vision
            </Badge>
          </div>
        </header>
        <p className="text-xs text-cream-200/70">
          Storageへアップロード済みの画像をGemini
          Visionで解析し、登録候補を作成します。候補は直接保存されません。
        </p>

        <div className="grid gap-3 rounded-xl border border-night-gold/25 bg-black/30 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="accent"
              disabled={!canAnalyzeImage}
              onClick={handleAnalyzeImage}
            >
              {isAnalyzingImage ? '画像解析中…' : '画像からAI候補作成'}
            </Button>
            <span className="text-xs text-cream-200/70">{hint}</span>
          </div>

          {imageAnalysisError ? (
            <Alert tone="error" title="解析に失敗しました">
              <div className="whitespace-pre-wrap">{imageAnalysisError}</div>
              <p className="mt-2 text-xs">
                画像を変えるか、手入力で登録してください。
              </p>
            </Alert>
          ) : null}

          {imageAnalysisResult ? (
            <div className="grid gap-3">
              <div className="text-xs text-cream-200/70">
                <Badge tone="accent" size="sm">
                  {imageAnalysisResult.candidates.length}件
                </Badge>
                のGemini Vision候補を作成しました。保存前に必ず確認してください。
              </div>
              <div className="rounded-xl border border-night-gold/25 bg-night-ink/75 p-3 text-xs text-cream-100/80">
                <div className="mb-2 font-bold text-night-glow">画像評価</div>
                <div className="grid gap-1 sm:grid-cols-2">
                  <div>
                    単体らしさ:{' '}
                    <span className="font-semibold">
                      {imageAnalysisResult.image_assessment.single_item_likely
                        ? '高い'
                        : '低い/不明'}
                    </span>
                  </div>
                  <div>
                    複数本の可能性:{' '}
                    <span className="font-semibold">
                      {imageAnalysisResult.image_assessment.multiple_items_likely
                        ? 'あり'
                        : '低い'}
                    </span>
                  </div>
                  <div>
                    ラベル可読性:{' '}
                    <span className="font-semibold">
                      {imageAnalysisResult.image_assessment.label_readable
                        ? '読めそう'
                        : '低い/不明'}
                    </span>
                  </div>
                  <div>
                    確認:{' '}
                    <span className="font-semibold">
                      {imageAnalysisResult.image_assessment.needs_review
                        ? '必要'
                        : '通常確認'}
                    </span>
                  </div>
                </div>
                {imageAnalysisResult.image_assessment.notes ? (
                  <div className="mt-2 text-cream-200/70">
                    {imageAnalysisResult.image_assessment.notes}
                  </div>
                ) : null}
              </div>
              {imageAnalysisResult.candidates.map((candidate) => (
                <AiCandidateCard
                  key={candidate.candidate_id}
                  candidate={candidate}
                  currentItemId={currentItemId}
                  currentValues={currentValues}
                  inventoryItems={inventoryItems}
                  referenceData={referenceData}
                  source={imageAnalysisResult.source}
                  onApply={onApplyCandidate}
                  onEditSimilarItem={onEditSimilarItem}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
