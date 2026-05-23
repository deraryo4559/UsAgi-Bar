import type { InventoryItem } from '../../../types/inventory';
import type { AiInventoryCandidate } from './types';
import type { CategoryReferenceData } from './aiCandidateNormalization';

export type SimilarInventoryReasonCode =
  | 'name_exact'
  | 'category_name_similar'
  | 'visible_text_contains_existing_name'
  | 'category_volume_close';

export type SimilarInventoryMatch = {
  item: InventoryItem;
  score: number;
  reasonCodes: SimilarInventoryReasonCode[];
  reasons: string[];
};

export type FindSimilarInventoryItemsInput = {
  candidate: AiInventoryCandidate;
  inventoryItems: InventoryItem[];
  referenceData: CategoryReferenceData;
  excludeItemId?: string | null;
};

function normalizeSearchText(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[・･.'’`´-]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function tokenize(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .split(/[^a-z0-9ぁ-んァ-ヶ一-龠ー]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function buildAliasMap(referenceData: CategoryReferenceData) {
  const aliases = new Map<string, string>();

  referenceData.ingredientAliases.forEach((alias) => {
    const canonical = normalizeSearchText(alias.canonical_name);
    aliases.set(canonical, canonical);
    aliases.set(normalizeSearchText(alias.alias_name), canonical);
  });

  return aliases;
}

function normalizeWithAliases(
  value: string | null,
  referenceData: CategoryReferenceData,
) {
  if (!value) {
    return '';
  }

  const normalized = normalizeSearchText(value);
  const aliases = buildAliasMap(referenceData);

  return aliases.get(normalized) ?? normalized;
}

function getCandidateEvidenceTexts(candidate: AiInventoryCandidate) {
  return [
    candidate.name,
    candidate.category,
    candidate.sub_category,
    ...candidate.evidence.visible_text,
    ...candidate.evidence.visual_cues,
  ].filter((value): value is string => Boolean(value?.trim()));
}

function haveSharedTokens(left: string | null, right: string | null) {
  if (!left || !right) {
    return false;
  }

  const leftTokens = new Set(tokenize(left));
  const rightTokens = tokenize(right);

  if (leftTokens.size === 0 || rightTokens.length === 0) {
    return false;
  }

  const sharedCount = rightTokens.filter((token) => leftTokens.has(token)).length;

  return sharedCount / Math.min(leftTokens.size, rightTokens.length) >= 0.6;
}

function namesAreSimilar(left: string | null, right: string | null) {
  const normalizedLeft = left ? normalizeSearchText(left) : '';
  const normalizedRight = right ? normalizeSearchText(right) : '';

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const shorterLength = Math.min(normalizedLeft.length, normalizedRight.length);

  if (
    shorterLength >= 4 &&
    (normalizedLeft.includes(normalizedRight) ||
      normalizedRight.includes(normalizedLeft))
  ) {
    return true;
  }

  return haveSharedTokens(left, right);
}

function containsExistingName(
  candidate: AiInventoryCandidate,
  item: InventoryItem,
) {
  const existingName = normalizeSearchText(item.name);

  if (existingName.length < 3) {
    return false;
  }

  return getCandidateEvidenceTexts(candidate).some((text) =>
    normalizeSearchText(text).includes(existingName),
  );
}

function volumeIsClose(
  candidateVolumeMl: number | null,
  itemVolumeMl: number | null,
) {
  if (
    candidateVolumeMl === null ||
    itemVolumeMl === null ||
    !Number.isFinite(candidateVolumeMl) ||
    !Number.isFinite(itemVolumeMl)
  ) {
    return false;
  }

  const difference = Math.abs(candidateVolumeMl - itemVolumeMl);
  const tolerance = Math.max(50, Math.max(candidateVolumeMl, itemVolumeMl) * 0.1);

  return difference <= tolerance;
}

export function findSimilarInventoryItems({
  candidate,
  inventoryItems,
  referenceData,
  excludeItemId,
}: FindSimilarInventoryItemsInput) {
  const candidateName = normalizeSearchText(candidate.name ?? '');
  const candidateCategory = normalizeWithAliases(
    candidate.category,
    referenceData,
  );

  return inventoryItems
    .filter((item) => item.id !== excludeItemId)
    .map((item): SimilarInventoryMatch | null => {
      const itemName = normalizeSearchText(item.name);
      const itemCategory = normalizeWithAliases(item.category, referenceData);
      const reasonCodes: SimilarInventoryReasonCode[] = [];
      const reasons: string[] = [];
      let score = 0;

      if (candidateName && itemName && candidateName === itemName) {
        score += 100;
        reasonCodes.push('name_exact');
        reasons.push('nameが完全一致しています。');
      }

      if (
        candidateCategory &&
        itemCategory &&
        candidateCategory === itemCategory &&
        namesAreSimilar(candidate.name, item.name)
      ) {
        score += 80;
        reasonCodes.push('category_name_similar');
        reasons.push('categoryが一致し、nameが似ています。');
      }

      if (
        candidateCategory &&
        itemCategory &&
        candidateCategory === itemCategory &&
        containsExistingName(candidate, item)
      ) {
        score += 70;
        reasonCodes.push('visible_text_contains_existing_name');
        reasons.push('AIが読んだ文字に既存nameが含まれています。');
      }

      if (
        candidateCategory &&
        itemCategory &&
        candidateCategory === itemCategory &&
        volumeIsClose(candidate.volume_ml, item.volume_ml)
      ) {
        score += 45;
        reasonCodes.push('category_volume_close');
        reasons.push('categoryが一致し、容量も近いです。');
      }

      if (score === 0) {
        return null;
      }

      return {
        item,
        score,
        reasonCodes: [...new Set(reasonCodes)],
        reasons: [...new Set(reasons)],
      };
    })
    .filter((match): match is SimilarInventoryMatch => match !== null)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.item.name.localeCompare(right.item.name, 'ja');
    });
}
