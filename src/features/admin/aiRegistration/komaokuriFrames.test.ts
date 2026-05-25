import { describe, expect, it } from 'vitest';
import {
  getKomaokuriFrameIndex,
  getSortedKomaokuriFrames,
} from './komaokuriFrames';

describe('komaokuriFrames', () => {
  it('sorts frame modules by numeric filename order', () => {
    expect(
      getSortedKomaokuriFrames({
        '../../../img/komaokuri/10.png': '/10.png',
        '../../../img/komaokuri/2.png': '/2.png',
        '../../../img/komaokuri/1.png': '/1.png',
      }),
    ).toEqual(['/1.png', '/2.png', '/10.png']);
  });

  it('handles empty frame sets without crashing', () => {
    expect(getSortedKomaokuriFrames({})).toEqual([]);
    expect(getKomaokuriFrameIndex({ currentIndex: 0, frameCount: 0 })).toBe(0);
  });

  it('loops frame indexes', () => {
    expect(getKomaokuriFrameIndex({ currentIndex: 2, frameCount: 4 })).toBe(3);
    expect(getKomaokuriFrameIndex({ currentIndex: 3, frameCount: 4 })).toBe(0);
  });
});
