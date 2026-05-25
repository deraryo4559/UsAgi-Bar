import { describe, expect, it } from 'vitest';
import {
  clampBox,
  normalizeBox,
  scaleBoxToDisplay,
  scaleBoxToImage,
} from './boundingBoxes';

describe('boundingBoxes', () => {
  it('clamps box coordinates to the Gemini 0-1000 scale', () => {
    expect(
      clampBox({
        xmin: -20,
        ymin: 10,
        xmax: 1050,
        ymax: 980,
      }),
    ).toEqual({
      xmin: 0,
      ymin: 10,
      xmax: 1000,
      ymax: 980,
    });
  });

  it('rejects invalid boxes', () => {
    expect(() =>
      normalizeBox({
        xmin: 500,
        ymin: 100,
        xmax: 200,
        ymax: 900,
      }),
    ).toThrow('xmin < xmax');
  });

  it('scales Gemini coordinates to source image pixels', () => {
    expect(
      scaleBoxToImage(
        {
          xmin: 250,
          ymin: 100,
          xmax: 750,
          ymax: 600,
        },
        {
          width: 2000,
          height: 1000,
        },
      ),
    ).toEqual({
      x: 500,
      y: 100,
      width: 1000,
      height: 500,
    });
  });

  it('scales Gemini coordinates to display pixels', () => {
    expect(
      scaleBoxToDisplay(
        {
          xmin: 100,
          ymin: 200,
          xmax: 400,
          ymax: 700,
        },
        {
          width: 300,
          height: 600,
        },
      ),
    ).toEqual({
      x: 30,
      y: 120,
      width: 90,
      height: 300,
    });
  });
});
