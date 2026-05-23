import { inventoryItemTypes } from '../../inventory/api/inventoryItems';
import type { InventoryItemFormValues } from '../inventoryForm';
import type { CocktailIngredient, IngredientAlias } from '../../../types/recipes';
import type { AiInventoryCandidate } from './types';

export type CategoryReferenceData = {
  cocktailIngredients: Pick<CocktailIngredient, 'ingredient_name'>[];
  ingredientAliases: Pick<IngredientAlias, 'canonical_name' | 'alias_name'>[];
};

export type CategoryMatchStatus = 'matched' | 'unmatched' | 'empty';

export type CandidateWarning = {
  code: string;
  message: string;
};

export type CandidateCategoryMatch = {
  status: CategoryMatchStatus;
  message: string;
  matchedName: string | null;
};

export type NormalizedAiCandidateResult = {
  candidate: AiInventoryCandidate;
  warnings: CandidateWarning[];
  autoFilledFields: string[];
  missingFields: string[];
  categoryMatch: CandidateCategoryMatch;
  formValuesPreview: InventoryItemFormValues;
  overwrittenFields: string[];
};

const aiMemo = '画像解析候補。保存前に確認してください。';

function normalizeSearchText(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

function textArray(candidate: AiInventoryCandidate) {
  return [
    candidate.name,
    candidate.category,
    candidate.sub_category,
    ...candidate.evidence.visible_text,
    ...candidate.evidence.visual_cues,
  ]
    .filter((value): value is string => typeof value === 'string')
    .map(normalizeSearchText)
    .join(' ');
}

function numberOrNull(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clampConfidence(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function withMemo(candidate: AiInventoryCandidate) {
  const currentMemo = candidate.memo?.trim();

  if (!currentMemo) {
    return aiMemo;
  }

  return currentMemo.includes(aiMemo) ? currentMemo : `${currentMemo}\n${aiMemo}`;
}

function findAliasCanonicalFromCandidate(
  candidate: AiInventoryCandidate,
  referenceData: CategoryReferenceData,
) {
  const searchValues = [
    candidate.category,
    candidate.name,
    candidate.sub_category,
    ...candidate.evidence.visible_text,
    ...candidate.evidence.visual_cues,
  ].filter((value): value is string => typeof value === 'string');
  const aliasMap = new Map(
    referenceData.ingredientAliases.map((alias) => [
      normalizeSearchText(alias.alias_name),
      alias.canonical_name,
    ]),
  );

  for (const value of searchValues) {
    const canonical = aliasMap.get(normalizeSearchText(value));

    if (canonical) {
      return {
        alias: value,
        canonical,
      };
    }
  }

  return null;
}

function applyKnownProductNormalization(candidate: AiInventoryCandidate) {
  const nextCandidate = { ...candidate };
  const normalizedText = textArray(candidate);
  const normalizedFields: string[] = [];

  if (
    normalizedText.includes('suntorysui') ||
    normalizedText.includes('翠') ||
    normalizedText.includes('翠ジン')
  ) {
    if (nextCandidate.category !== 'ジン') {
      nextCandidate.category = 'ジン';
      normalizedFields.push('category');
    }

    if (!nextCandidate.sub_category) {
      nextCandidate.sub_category = 'ジャパニーズジン';
      normalizedFields.push('sub_category');
    }

    nextCandidate.item_type = 'alcohol';
  }

  if (normalizedText.includes('kahlua') || normalizedText.includes('カルーア')) {
    if (nextCandidate.category !== 'コーヒーリキュール') {
      nextCandidate.category = 'コーヒーリキュール';
      normalizedFields.push('category');
    }

    nextCandidate.item_type = 'alcohol';
  }

  if (normalizedText.includes('三岳') || normalizedText.includes('みたけ')) {
    if (nextCandidate.category !== '焼酎') {
      nextCandidate.category = '焼酎';
      normalizedFields.push('category');
    }

    if (!nextCandidate.sub_category) {
      nextCandidate.sub_category = '芋焼酎';
      normalizedFields.push('sub_category');
    }

    nextCandidate.item_type = 'alcohol';
  }

  if (normalizedText.includes('浦霞')) {
    if (nextCandidate.category !== '日本酒') {
      nextCandidate.category = '日本酒';
      normalizedFields.push('category');
    }

    nextCandidate.item_type = 'alcohol';
  }

  return { candidate: nextCandidate, normalizedFields };
}

function getCategoryReferenceSet(referenceData: CategoryReferenceData) {
  return new Map(
    [
      ...referenceData.cocktailIngredients.map(
        (ingredient) => ingredient.ingredient_name,
      ),
      ...referenceData.ingredientAliases.flatMap((alias) => [
        alias.canonical_name,
        alias.alias_name,
      ]),
    ]
      .filter(Boolean)
      .map((name) => [normalizeSearchText(name), name] as const),
  );
}

export function checkCategoryMatch(
  category: string | null,
  referenceData: CategoryReferenceData,
): CandidateCategoryMatch {
  const trimmedCategory = category?.trim();

  if (!trimmedCategory) {
    return {
      status: 'empty',
      message: 'categoryが空です。レシピ照合に使う材料名を確認してください。',
      matchedName: null,
    };
  }

  const referenceSet = getCategoryReferenceSet(referenceData);
  const matchedName = referenceSet.get(normalizeSearchText(trimmedCategory));

  if (matchedName) {
    return {
      status: 'matched',
      message: `category「${trimmedCategory}」はカクテルDB照合に利用できます。`,
      matchedName,
    };
  }

  return {
    status: 'unmatched',
    message: `category「${trimmedCategory}」は現在のカクテルDBに未登録です。レシピ照合に使えない可能性があります。`,
    matchedName: null,
  };
}

function textToFormValue(value: string | null) {
  return value?.trim() ?? '';
}

function numberToFormValue(value: number | null) {
  return value === null ? '' : String(value);
}

function shouldFill(currentValue: string, nextValue: string) {
  return !currentValue.trim() && nextValue.trim();
}

export function previewAiCandidateFormValues({
  currentValues,
  candidate,
}: {
  currentValues: InventoryItemFormValues;
  candidate: AiInventoryCandidate;
}) {
  const nextValues = { ...currentValues };
  const overwrittenFields: string[] = [];

  function fillTextField(
    key: Exclude<keyof InventoryItemFormValues, 'item_type'>,
    value: string,
  ) {
    if (!value.trim()) {
      return;
    }

    if (shouldFill(nextValues[key], value)) {
      nextValues[key] = value;
      return;
    }

    if (nextValues[key] !== value) {
      overwrittenFields.push(key);
    }
  }

  fillTextField('name', textToFormValue(candidate.name));
  fillTextField('category', textToFormValue(candidate.category));
  fillTextField('sub_category', textToFormValue(candidate.sub_category));
  fillTextField(
    'alcohol_percentage',
    numberToFormValue(candidate.alcohol_percentage),
  );
  fillTextField('volume_ml', numberToFormValue(candidate.volume_ml));
  fillTextField(
    'remaining_ml',
    numberToFormValue(candidate.remaining_ml ?? candidate.volume_ml),
  );

  if (candidate.item_type && candidate.item_type !== currentValues.item_type) {
    const isDefaultAlcoholOnEmptyForm =
      currentValues.item_type === 'alcohol' &&
      !currentValues.name.trim() &&
      !currentValues.category.trim();

    if (isDefaultAlcoholOnEmptyForm) {
      nextValues.item_type = candidate.item_type;
    } else {
      overwrittenFields.push('item_type');
    }
  }

  const memo = textToFormValue(candidate.memo);

  if (memo) {
    const currentMemo = currentValues.memo.trim();
    nextValues.memo = currentMemo
      ? currentMemo.includes(memo)
        ? currentMemo
        : `${currentMemo}\n${memo}`
      : memo;
  }

  return {
    values: nextValues,
    overwrittenFields: [...new Set(overwrittenFields)],
  };
}

export function normalizeAiCandidate({
  candidate,
  currentValues,
  referenceData,
}: {
  candidate: AiInventoryCandidate;
  currentValues: InventoryItemFormValues;
  referenceData: CategoryReferenceData;
}): NormalizedAiCandidateResult {
  const warnings: CandidateWarning[] = [];
  const autoFilledFields: string[] = [];
  const normalizedCandidate = { ...candidate };
  const aliasMatch = findAliasCanonicalFromCandidate(
    normalizedCandidate,
    referenceData,
  );

  if (aliasMatch && normalizedCandidate.category !== aliasMatch.canonical) {
    normalizedCandidate.category = aliasMatch.canonical;
    autoFilledFields.push('category');
    warnings.push({
      code: 'category_alias_normalized',
      message: `categoryをalias「${aliasMatch.alias}」に基づいて${aliasMatch.canonical}へ補正しました。`,
    });
  }

  const productNormalization = aliasMatch
    ? { candidate: normalizedCandidate, normalizedFields: [] }
    : applyKnownProductNormalization(normalizedCandidate);
  Object.assign(normalizedCandidate, productNormalization.candidate);
  const itemType = normalizedCandidate.item_type;

  autoFilledFields.push(...productNormalization.normalizedFields);

  if (itemType !== null && !inventoryItemTypes.includes(itemType)) {
    warnings.push({
      code: 'invalid_item_type',
      message: 'item_typeが許可値ではありません。確認してください。',
    });
    normalizedCandidate.item_type = null;
  }

  normalizedCandidate.confidence = clampConfidence(normalizedCandidate.confidence);
  normalizedCandidate.alcohol_percentage = numberOrNull(
    normalizedCandidate.alcohol_percentage,
  );
  normalizedCandidate.volume_ml = numberOrNull(normalizedCandidate.volume_ml);
  normalizedCandidate.remaining_ml = numberOrNull(
    normalizedCandidate.remaining_ml,
  );
  normalizedCandidate.memo = withMemo(normalizedCandidate);

  if (!normalizedCandidate.name?.trim() && normalizedCandidate.category?.trim()) {
    normalizedCandidate.name = normalizedCandidate.category;
    autoFilledFields.push('name');
    warnings.push({
      code: 'name_from_category',
      message: '商品名が空だったため、categoryをname候補として補完しました。',
    });
  }

  if (
    normalizedCandidate.volume_ml !== null &&
    normalizedCandidate.remaining_ml === null
  ) {
    normalizedCandidate.remaining_ml = normalizedCandidate.volume_ml;
    autoFilledFields.push('remaining_ml');
    warnings.push({
      code: 'remaining_from_volume',
      message: 'remaining_ml は volume_ml と同じ値で補完しました。',
    });
  }

  if (!normalizedCandidate.category?.trim()) {
    warnings.push({
      code: 'missing_category',
      message: 'categoryが未判定です。レシピ照合に使う材料名を確認してください。',
    });
  }

  if (
    normalizedCandidate.item_type === 'alcohol' &&
    normalizedCandidate.alcohol_percentage === null
  ) {
    warnings.push({
      code: 'missing_alcohol_percentage',
      message: '度数が未判定です。必要なら入力してください。',
    });
  }

  const categoryMatch = checkCategoryMatch(
    normalizedCandidate.category,
    referenceData,
  );

  if (categoryMatch.status !== 'matched') {
    warnings.push({
      code: `category_${categoryMatch.status}`,
      message: categoryMatch.message,
    });
  }

  const missingFields = [
    !normalizedCandidate.name?.trim() ? 'name' : null,
    !normalizedCandidate.item_type ? 'item_type' : null,
    !normalizedCandidate.category?.trim() ? 'category' : null,
    normalizedCandidate.item_type === 'alcohol' &&
    normalizedCandidate.alcohol_percentage === null
      ? 'alcohol_percentage'
      : null,
    normalizedCandidate.volume_ml === null ? 'volume_ml' : null,
  ].filter((field): field is string => field !== null);

  const preview = previewAiCandidateFormValues({
    currentValues,
    candidate: normalizedCandidate,
  });

  return {
    candidate: normalizedCandidate,
    warnings,
    autoFilledFields: [...new Set(autoFilledFields)],
    missingFields,
    categoryMatch,
    formValuesPreview: preview.values,
    overwrittenFields: preview.overwrittenFields,
  };
}
