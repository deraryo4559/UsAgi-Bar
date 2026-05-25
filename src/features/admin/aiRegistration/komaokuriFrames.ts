export type KomaokuriFrameModuleMap = Record<string, string>;

function collator() {
  return new Intl.Collator('ja-JP', {
    numeric: true,
    sensitivity: 'base',
  });
}

export function getSortedKomaokuriFrames(
  frameModules: KomaokuriFrameModuleMap,
) {
  return Object.entries(frameModules)
    .sort(([left], [right]) => collator().compare(left, right))
    .map(([, url]) => url)
    .filter(Boolean);
}

export function getKomaokuriFrameIndex({
  currentIndex,
  frameCount,
}: {
  currentIndex: number;
  frameCount: number;
}) {
  if (frameCount <= 0) {
    return 0;
  }

  return (currentIndex + 1) % frameCount;
}
