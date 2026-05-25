import { useEffect, useMemo, useState } from 'react';
import fallbackRabbitUrl from '../../../img/logo.png';
import {
  getKomaokuriFrameIndex,
  getSortedKomaokuriFrames,
  type KomaokuriFrameModuleMap,
} from './komaokuriFrames';

const frameModules = import.meta.glob('../../../img/komaokuri/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as KomaokuriFrameModuleMap;

type KomaokuriRabbitProps = {
  active: boolean;
  intervalMs?: number;
  className?: string;
};

export function KomaokuriRabbit({
  active,
  intervalMs = 360,
  className = '',
}: KomaokuriRabbitProps) {
  const frames = useMemo(() => getSortedKomaokuriFrames(frameModules), []);
  const [frameIndex, setFrameIndex] = useState(0);
  const imageUrl = frames[frameIndex] ?? fallbackRabbitUrl;

  useEffect(() => {
    if (!active || frames.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setFrameIndex((currentIndex) =>
        getKomaokuriFrameIndex({
          currentIndex,
          frameCount: frames.length,
        }),
      );
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [active, frames.length, intervalMs]);

  useEffect(() => {
    if (!active) {
      setFrameIndex(0);
    }
  }, [active]);

  return (
    <img
      src={imageUrl}
      alt="解析中のうさぎ店主"
      className={`select-none object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.55)] ${className}`}
      draggable={false}
    />
  );
}
