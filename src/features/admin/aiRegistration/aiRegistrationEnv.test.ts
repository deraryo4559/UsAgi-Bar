import { describe, expect, it } from 'vitest';

const sourceFiles = import.meta.glob('/src/**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
});

describe('Gemini frontend env safety', () => {
  it('does not reference a Vite-exposed Gemini API key in frontend source', () => {
    const forbidden = `VITE_${'GEMINI_API_KEY'}`;

    for (const [path, source] of Object.entries(sourceFiles)) {
      expect(String(source), path).not.toContain(forbidden);
    }
  });
});
