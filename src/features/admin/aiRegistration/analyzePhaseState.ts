import type { AiRegistrationStep } from './aiRegistrationFlow';

export const analyzePhases = [
  {
    step: 'uploading',
    label: '画像を保存中',
    message: '画像を保存しているぞ',
  },
  {
    step: 'detecting',
    label: '候補を探し中',
    message: 'お酒っぽいものを探してるぞ',
  },
  {
    step: 'cropping',
    label: '切り抜き中',
    message: '候補を切り抜いてるぞ',
  },
  {
    step: 'analyzing',
    label: '商品判定中',
    message: 'どんなお酒か見てるぞ',
  },
  {
    step: 'thumbnailing',
    label: 'サムネ作成中',
    message: '酒棚用に描いてるぞ',
  },
  {
    step: 'normalizing',
    label: '候補整理中',
    message: '登録候補をまとめてるぞ',
  },
] as const;

const activePhaseOrder: Partial<Record<AiRegistrationStep, number>> = {
  uploading: 0,
  detecting: 1,
  cropping: 2,
  analyzing: 3,
  thumbnailing: 4,
  normalizing: 5,
  review: 6,
  saving: 6,
  done: 6,
};

export function getAnalyzePhaseStatus(
  phaseIndex: number,
  currentStep: AiRegistrationStep,
) {
  const currentIndex = activePhaseOrder[currentStep] ?? -1;

  if (currentIndex > phaseIndex) {
    return 'done';
  }

  if (currentIndex === phaseIndex) {
    return 'active';
  }

  return 'waiting';
}
