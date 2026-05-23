import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
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

type InventoryItemFormProps = {
  values: InventoryItemFormValues;
  imageFile: File | null;
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
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded border border-stone-200 bg-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          name
          <input
            className="rounded border border-stone-300 px-3 py-2"
            value={values.name}
            onChange={(event) => onChange('name', event.target.value)}
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          item_type
          <select
            className="rounded border border-stone-300 px-3 py-2"
            value={values.item_type}
            onChange={(event) =>
              onChange('item_type', event.target.value as typeof values.item_type)
            }
          >
            {inventoryItemTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          category
          <input
            className="rounded border border-stone-300 px-3 py-2"
            value={values.category}
            onChange={(event) => onChange('category', event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          sub_category
          <input
            className="rounded border border-stone-300 px-3 py-2"
            value={values.sub_category}
            onChange={(event) => onChange('sub_category', event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          alcohol_percentage
          <input
            className="rounded border border-stone-300 px-3 py-2"
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
        <label className="grid gap-1 text-sm font-medium">
          volume_ml
          <input
            className="rounded border border-stone-300 px-3 py-2"
            inputMode="decimal"
            min="0"
            type="number"
            value={values.volume_ml}
            onChange={(event) => onChange('volume_ml', event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          remaining_ml
          <input
            className="rounded border border-stone-300 px-3 py-2"
            inputMode="decimal"
            min="0"
            type="number"
            value={values.remaining_ml}
            onChange={(event) => onChange('remaining_ml', event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          display_order
          <input
            className="rounded border border-stone-300 px-3 py-2"
            inputMode="numeric"
            type="number"
            value={values.display_order}
            onChange={(event) => onChange('display_order', event.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {presetOptions.map((option) => (
          <Button
            key={option.label}
            type="button"
            variant="secondary"
            className="px-3 py-1"
            disabled={!canUsePreset && option.ratio !== 0}
            onClick={() => handlePreset(option.ratio)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <label className="grid gap-1 text-sm font-medium">
        image_url
        <input
          className="rounded border border-stone-300 px-3 py-2"
          value={values.image_url}
          onChange={(event) => onChange('image_url', event.target.value)}
        />
      </label>
      {values.image_url ? (
        <img
          className="max-h-40 w-fit rounded border border-stone-200 object-contain"
          src={values.image_url}
          alt="登録画像プレビュー"
        />
      ) : null}

      <div className="grid gap-2 rounded border border-stone-200 bg-stone-50 p-3">
        <label className="grid gap-1 text-sm font-medium">
          画像アップロード
          <input
            accept="image/jpeg,image/png,image/webp"
            className="rounded border border-stone-300 bg-white px-3 py-2"
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
            {isUploadingImage ? 'アップロード中' : '画像アップロード'}
          </Button>
          {imageFile ? (
            <span className="text-xs text-stone-500">
              {imageFile.name} / {Math.round(imageFile.size / 1024)}KB
            </span>
          ) : null}
        </div>
      </div>

      <label className="grid gap-1 text-sm font-medium">
        memo
        <textarea
          className="min-h-24 rounded border border-stone-300 px-3 py-2"
          value={values.memo}
          onChange={(event) => onChange('memo', event.target.value)}
        />
      </label>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '保存中' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
