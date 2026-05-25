import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  calculateRemainingMl,
  inventoryItemTypes,
} from '../inventory/api/inventoryItems';
import type { InventoryItemFormValues } from './inventoryForm';

const presetOptions = [
  { label: '100%', ratio: 1 },
  { label: '75%', ratio: 0.75 },
  { label: '50%', ratio: 0.5 },
  { label: '25%', ratio: 0.25 },
  { label: '空', ratio: 0 },
];

const fieldLabels: Record<string, string> = {
  name: '商品名 (name)',
  item_type: '種別 (item_type)',
  category: 'category（標準材料名）',
  sub_category: 'sub_category',
  alcohol_percentage: '度数 alcohol_percentage (%)',
  volume_ml: '容量 volume_ml',
  remaining_ml: '残量 remaining_ml',
  display_order: '表示順 display_order',
  image_url: 'image_url',
  thumbnail_url: 'thumbnail_url',
  thumbnail_prompt: 'thumbnail_prompt',
  thumbnail_provider: 'thumbnail_provider',
};

const inputClass =
  'rounded-xl border border-night-gold/30 bg-black/35 px-3 py-2 text-sm font-normal text-cream-50 shadow-chip placeholder:text-cream-200/35 focus:border-night-neon focus:outline-none focus:ring-2 focus:ring-night-neon/25';

type InventoryItemFormProps = {
  values: InventoryItemFormValues;
  imageFile: File | null;
  imagePath: string | null;
  isSubmitting: boolean;
  isUploadingImage: boolean;
  submitLabel: string;
  onChange: <K extends keyof InventoryItemFormValues>(
    key: K,
    value: InventoryItemFormValues[K],
  ) => void;
  onImageFileChange: (file: File | null) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onUploadImage: () => void;
};

export function InventoryItemForm({
  values,
  imageFile,
  imagePath,
  isSubmitting,
  isUploadingImage,
  submitLabel,
  onChange,
  onImageFileChange,
  onSubmit,
  onCancel,
  onUploadImage,
}: InventoryItemFormProps) {
  const volumeMl = values.volume_ml.trim() ? Number(values.volume_ml) : null;
  const canUsePreset = volumeMl !== null && Number.isFinite(volumeMl);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onImageFileChange(event.target.files?.[0] ?? null);
  }

  function handlePreset(ratio: number) {
    const remainingMl = calculateRemainingMl(volumeMl, ratio);

    if (remainingMl !== null) {
      onChange('remaining_ml', String(remainingMl));
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="grid gap-5">
        <section className="grid gap-3 rounded-xl border border-night-gold/30 bg-night-warm/60 p-4">
          <header className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-cream-50">
              手入力・編集用の画像
            </h3>
            <span className="text-[11px] text-cream-200/60">
              jpg / png / webp / 2MB以下
            </span>
          </header>
          <label className="grid gap-1 text-sm font-semibold">
            画像ファイル
            <input
              accept="image/jpeg,image/png,image/webp"
              className={`${inputClass} file:mr-3 file:rounded-full file:border-0 file:bg-night-gold file:px-3 file:py-1 file:text-xs file:font-semibold file:text-night-deep hover:file:bg-night-glow`}
              type="file"
              onChange={handleFileChange}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!imageFile || isUploadingImage}
              onClick={onUploadImage}
            >
              {isUploadingImage ? 'アップロード中…' : '画像を保存'}
            </Button>
            {imageFile ? (
              <span className="text-xs text-cream-200/60">
                {imageFile.name} / {Math.round(imageFile.size / 1024)}KB
              </span>
            ) : null}
          </div>
          {values.image_url ? (
            <div className="flex items-end gap-3 rounded-xl bg-black/30 p-3 ring-1 ring-night-gold/25">
              <img
                className="max-h-32 w-fit rounded-lg object-contain"
                src={values.image_url}
                alt="登録画像プレビュー"
                draggable={false}
              />
              <span className="text-[11px] text-cream-200/60">
                {imagePath ?? '画像URL設定済み'}
              </span>
            </div>
          ) : null}
        </section>

        <section className="grid gap-4">
          <header className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-cream-50">
              内容を確認・修正
            </h3>
            <span className="text-[11px] text-cream-200/60">
              （保存前に必ず確認してください）
            </span>
          </header>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              {fieldLabels.name}
              <input
                className={inputClass}
                value={values.name}
                onChange={(event) => onChange('name', event.target.value)}
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {fieldLabels.item_type}
              <select
                className={inputClass}
                value={values.item_type}
                onChange={(event) =>
                  onChange(
                    'item_type',
                    event.target.value as typeof values.item_type,
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
                value={values.category}
                onChange={(event) => onChange('category', event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {fieldLabels.sub_category}
              <input
                className={inputClass}
                value={values.sub_category}
                onChange={(event) =>
                  onChange('sub_category', event.target.value)
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
                value={values.alcohol_percentage}
                onChange={(event) =>
                  onChange('alcohol_percentage', event.target.value)
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
                value={values.volume_ml}
                onChange={(event) => onChange('volume_ml', event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {fieldLabels.remaining_ml}
              <input
                className={inputClass}
                inputMode="decimal"
                min="0"
                type="number"
                value={values.remaining_ml}
                onChange={(event) =>
                  onChange('remaining_ml', event.target.value)
                }
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {fieldLabels.display_order}
              <input
                className={inputClass}
                inputMode="numeric"
                type="number"
                value={values.display_order}
                onChange={(event) =>
                  onChange('display_order', event.target.value)
                }
              />
            </label>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-cream-200/70">
              残量プリセット
            </div>
            <div className="flex flex-wrap gap-2">
              {presetOptions.map((option) => (
                <Button
                  key={option.label}
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!canUsePreset && option.ratio !== 0}
                  onClick={() => handlePreset(option.ratio)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <label className="grid gap-1 text-sm font-semibold">
            {fieldLabels.image_url}
            <input
              className={inputClass}
              value={values.image_url}
              onChange={(event) => onChange('image_url', event.target.value)}
            />
          </label>

          <details className="rounded-xl border border-night-gold/25 bg-black/25 p-3">
            <summary className="cursor-pointer text-sm font-bold text-cream-50">
              酒棚サムネイル設定
            </summary>
            <div className="mt-3 grid gap-3">
              {values.thumbnail_url ? (
                <div className="flex items-end gap-3 rounded-xl bg-black/30 p-3 ring-1 ring-night-gold/25">
                  <img
                    className="max-h-28 w-fit rounded-lg object-contain"
                    src={values.thumbnail_url}
                    alt="サムネイルプレビュー"
                    draggable={false}
                  />
                  <span className="text-[11px] text-cream-200/60">
                    酒棚ではこの画像を優先表示します。
                  </span>
                </div>
              ) : (
                <p className="text-xs text-cream-200/60">
                  サムネイルがない場合は image_url を使います。
                </p>
              )}
              <label className="grid gap-1 text-sm font-semibold">
                {fieldLabels.thumbnail_url}
                <input
                  className={inputClass}
                  value={values.thumbnail_url}
                  onChange={(event) =>
                    onChange('thumbnail_url', event.target.value)
                  }
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                {fieldLabels.thumbnail_prompt}
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={values.thumbnail_prompt}
                  onChange={(event) =>
                    onChange('thumbnail_prompt', event.target.value)
                  }
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                {fieldLabels.thumbnail_provider}
                <input
                  className={inputClass}
                  value={values.thumbnail_provider}
                  onChange={(event) =>
                    onChange('thumbnail_provider', event.target.value)
                  }
                />
              </label>
            </div>
          </details>

          <label className="grid gap-1 text-sm font-semibold">
            memo
            <textarea
              className={`${inputClass} min-h-24`}
              value={values.memo}
              onChange={(event) => onChange('memo', event.target.value)}
            />
          </label>
        </section>

        <div className="flex flex-wrap justify-end gap-2 border-t border-night-gold/25 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="submit" variant="accent" disabled={isSubmitting}>
            {isSubmitting ? '保存中…' : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
