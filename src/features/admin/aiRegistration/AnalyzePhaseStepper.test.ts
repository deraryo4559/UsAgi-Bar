import { describe, expect, it } from 'vitest';
import { getAnalyzePhaseStatus } from './analyzePhaseState';

describe('AnalyzePhaseStepper', () => {
  it('marks previous, current, and waiting phases', () => {
    expect(getAnalyzePhaseStatus(0, 'cropping')).toBe('done');
    expect(getAnalyzePhaseStatus(2, 'cropping')).toBe('active');
    expect(getAnalyzePhaseStatus(4, 'cropping')).toBe('waiting');
    expect(getAnalyzePhaseStatus(4, 'thumbnailing')).toBe('active');
  });

  it('marks all analyze phases as done in review', () => {
    expect(getAnalyzePhaseStatus(4, 'review')).toBe('done');
    expect(getAnalyzePhaseStatus(5, 'review')).toBe('done');
  });
});
