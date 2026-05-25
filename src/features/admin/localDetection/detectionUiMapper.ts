import type { LocalDetection } from './types';

export type LocalDetectionDraft = LocalDetection & {
  accepted: boolean;
};

export function createLocalDetectionDrafts(detections: LocalDetection[]) {
  return detections.map((detection) => ({
    ...detection,
    accepted: true,
  }));
}

export function setLocalDetectionAccepted(
  drafts: LocalDetectionDraft[],
  detectionId: string,
  accepted: boolean,
) {
  return drafts.map((draft) =>
    draft.detectionId === detectionId ? { ...draft, accepted } : draft,
  );
}

export function getAcceptedLocalDetectionDrafts(drafts: LocalDetectionDraft[]) {
  return drafts.filter((draft) => draft.accepted);
}
