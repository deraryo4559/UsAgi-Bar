import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { InventoryItemFormValues } from '../inventoryForm';
import type { InventoryItem } from '../../../types/inventory';
import {
  normalizeAiCandidate,
  type CategoryReferenceData,
} from './aiCandidateNormalization';
import { findSimilarInventoryItems } from './aiCandidateSimilarity';
import { getCandidateReviewReasons } from './aiRegistrationValidation';
import type { AiInventoryCandidate, AiInventorySource } from './types';

type AiCandidateCardProps = {
  candidate: AiInventoryCandidate;
  currentValues: InventoryItemFormValues;
  referenceData: CategoryReferenceData;
  inventoryItems: InventoryItem[];
  currentItemId?: string | null;
  source?: AiInventorySource;
  onApply: (candidate: AiInventoryCandidate) => void;
  onEditSimilarItem?: (item: InventoryItem) => void;
};

function valueOrEmpty(value: string | number | null) {
  return value === null || value === '' ? (
    <span className="text-cream-200/40">未判定</span>
  ) : (
    value
  );
}

const fieldColumns: Array<{
  key:
    | 'name'
    | 'item_type'
    | 'category'
    | 'sub_category'
    | 'alcohol_percentage'
    | 'volume_ml'
    | 'remaining_ml';
  label: string;
}> = [
  { key: 'name', label: 'name' },
  { key: 'item_type', label: 'item_type' },
  { key: 'category', label: 'category' },
  { key: 'sub_category', label: 'sub_category' },
  { key: 'alcohol_percentage', label: 'alcohol_percentage' },
  { key: 'volume_ml', label: 'volume_ml' },
  { key: 'remaining_ml', label: 'remaining_ml' },
];

export function AiCandidateCard({
  candidate,
  currentValues,
  referenceData,
  inventoryItems,
  currentItemId,
  source,
  onApply,
  onEditSimilarItem,
}: AiCandidateCardProps) {
  const normalized = normalizeAiCandidate({
    candidate,
    currentValues,
    referenceData,
  });
  const similarInventoryItems = findSimilarInventoryItems({
    candidate: normalized.candidate,
    inventoryItems,
    referenceData,
    excludeItemId: currentItemId,
  }).slice(0, 3);
  const reviewReasons = [
    ...getCandidateReviewReasons(normalized.candidate, source),
    ...normalized.warnings.map((warning) => warning.message),
    ...similarInventoryItems.map(
      (match) =>
        `既存在庫「${match.item.name}」と似ています。新規登録ではなく既存アイテム更新も検討してください。`,
    ),
  ];
  const uniqueReviewReasons = [...new Set(reviewReasons)];
  const formPreview = normalized.formValuesPreview;
  const isCategoryMatched = normalized.categoryMatch.status === 'matched';

  function rawValueFor(key: (typeof fieldColumns)[number]['key']) {
    switch (key) {
      case 'name':
        return candidate.name;
      case 'item_type':
        return candidate.item_type;
      case 'category':
        return candidate.category;
      case 'sub_category':
        return candidate.sub_category;
      case 'alcohol_percentage':
        return candidate.alcohol_percentage;
      case 'volume_ml':
        return candidate.volume_ml;
      case 'remaining_ml':
        return candidate.remaining_ml;
    }
  }

  function normalizedValueFor(key: (typeof fieldColumns)[number]['key']) {
    switch (key) {
      case 'name':
        return normalized.candidate.name;
      case 'item_type':
        return normalized.candidate.item_type;
      case 'category':
        return normalized.candidate.category;
      case 'sub_category':
        return normalized.candidate.sub_category;
      case 'alcohol_percentage':
        return normalized.candidate.alcohol_percentage;
      case 'volume_ml':
        return normalized.candidate.volume_ml;
      case 'remaining_ml':
        return normalized.candidate.remaining_ml;
    }
  }

  return (
    <article className="grid gap-3 rounded-2xl border border-night-gold/35 bg-night-ink/90 p-4 text-cream-50 shadow-bar">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="accent" size="sm">
              3 候補カード
            </Badge>
            <Badge tone="info" size="sm">
              confidence {normalized.candidate.confidence.toFixed(2)}
            </Badge>
          </div>
          <h4 className="mt-2 text-base font-extrabold text-cream-50">
            {normalized.candidate.name || '商品名未判定'}
          </h4>
        </div>
        <Badge tone={normalized.candidate.needs_review ? 'warn' : 'mint'}>
          {normalized.candidate.needs_review ? '要確認' : '候補'}
        </Badge>
      </header>

      {/* AI raw → 正規化後 → フォーム反映後 を1表で見せる */}
      <div className="overflow-x-auto rounded-xl border border-night-gold/25">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-black/35 text-cream-200/70">
            <tr>
              <th className="px-3 py-2 font-semibold">項目</th>
              <th className="px-3 py-2 font-semibold">AI候補 (raw)</th>
              <th className="px-3 py-2 font-semibold">正規化後</th>
              <th className="px-3 py-2 font-semibold">フォーム反映後</th>
            </tr>
          </thead>
          <tbody>
            {fieldColumns.map((field) => {
              const isFormPreviewField =
                field.key === 'name' ||
                field.key === 'item_type' ||
                field.key === 'category' ||
                field.key === 'remaining_ml';
              const previewValue = isFormPreviewField
                ? formPreview[field.key as keyof typeof formPreview]
                : null;

              return (
                <tr
                  key={field.key}
                  className="border-t border-night-gold/15 align-top"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-cream-200/70">
                    {field.label}
                  </td>
                  <td className="px-3 py-2 text-cream-200/60">
                    {valueOrEmpty(rawValueFor(field.key))}
                  </td>
                  <td className="px-3 py-2 font-semibold text-night-glow">
                    {valueOrEmpty(normalizedValueFor(field.key))}
                  </td>
                  <td className="px-3 py-2 text-cream-50">
                    {previewValue !== null && previewValue !== undefined
                      ? valueOrEmpty(previewValue)
                      : <span className="text-cream-200/30">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* category補正 / カクテルDB照合 */}
      <div
        className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
          isCategoryMatched
            ? 'border-night-mint/45 bg-night-mint/15 text-night-mint'
            : 'border-night-orange/45 bg-night-orange/15 text-night-glow'
        }`}
      >
        <span aria-hidden="true">{isCategoryMatched ? '✅' : '⚠️'}</span>
        <div>
          <div className="font-bold">カクテルDB照合</div>
          <div className="mt-0.5">{normalized.categoryMatch.message}</div>
        </div>
      </div>

      {/* 自動補完 / 未入力 / 既存保持 のチップ */}
      {(normalized.autoFilledFields.length > 0 ||
        normalized.missingFields.length > 0 ||
        normalized.overwrittenFields.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {normalized.autoFilledFields.map((field) => (
            <Badge key={`auto-${field}`} tone="info" size="sm">
              自動補完: {field}
            </Badge>
          ))}
          {normalized.missingFields.map((field) => (
            <Badge key={`miss-${field}`} tone="warn" size="sm">
              未入力: {field}
            </Badge>
          ))}
          {normalized.overwrittenFields.map((field) => (
            <Badge key={`keep-${field}`} tone="neutral" size="sm">
              既存保持: {field}
            </Badge>
          ))}
        </div>
      )}

      {/* 確認ポイント */}
      {uniqueReviewReasons.length ? (
        <div className="rounded-xl border border-night-orange/40 bg-night-orange/15 p-3 text-xs text-night-glow">
          <div className="mb-1 font-bold">確認ポイント</div>
          <ul className="list-disc space-y-0.5 pl-5">
            {uniqueReviewReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 重複候補 */}
      {similarInventoryItems.length ? (
        <div className="rounded-xl border border-night-neon/40 bg-night-neon/15 p-3 text-xs text-rose-100">
          <div className="font-bold">重複候補があります</div>
          <p className="mt-0.5">
            新規登録する前に、既存アイテムの編集でよいか確認してください。
          </p>
          <div className="mt-2 grid gap-2">
            {similarInventoryItems.map((match) => (
              <div
                key={match.item.id}
                className="rounded-xl border border-night-neon/25 bg-black/30 p-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-cream-50">
                      {match.item.name}
                    </div>
                    <div className="text-[11px] text-cream-200/60">
                      {match.item.item_type} /{' '}
                      {match.item.category ?? 'category未設定'} /{' '}
                      {match.item.volume_ml ?? '-'}ml
                    </div>
                  </div>
                  <Badge tone="warn" size="sm">
                    類似度 {match.score}
                  </Badge>
                </div>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] text-cream-200/70">
                  {match.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                {onEditSimilarItem ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2"
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

      {/* 画像から読めた文字 / 視覚的な根拠 */}
      <div className="grid gap-2 sm:grid-cols-2">
        {normalized.candidate.evidence.visible_text.length ? (
          <div className="rounded-xl border border-night-gold/25 bg-black/30 p-2">
            <div className="text-[11px] font-bold text-cream-200/70">
              画像から読めた文字
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {normalized.candidate.evidence.visible_text.map((text) => (
                <span
                  key={text}
                  className="rounded-full border border-night-gold/25 bg-night-warm/80 px-2 py-0.5 text-[11px] text-cream-100/80"
                >
                  {text}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {normalized.candidate.evidence.visual_cues.length ? (
          <div className="rounded-xl border border-night-gold/25 bg-black/30 p-2">
            <div className="text-[11px] font-bold text-cream-200/70">
              視覚的な根拠
            </div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] text-cream-100/80">
              {normalized.candidate.evidence.visual_cues.map((cue) => (
                <li key={cue}>{cue}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {source?.kind === 'gemini_vision' ? (
        <div className="text-[10px] text-cream-200/50">
          画像解析ソース: {source.image_path}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="accent"
          onClick={() => onApply(normalized.candidate)}
        >
          <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/30 text-[10px]">
            4
          </span>
          フォームに反映
        </Button>
      </div>
    </article>
  );
}
