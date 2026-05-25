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

  it('does not reference Vite-exposed image generation or Cloudflare secrets in frontend source', () => {
    const forbiddenValues = [
      `VITE_${'IMAGE_GENERATION_API_KEY'}`,
      `VITE_${'CLOUDFLARE_API_TOKEN'}`,
      `VITE_${'CLOUDFLARE_ACCOUNT_ID'}`,
    ];

    for (const [path, source] of Object.entries(sourceFiles)) {
      for (const forbidden of forbiddenValues) {
        expect(String(source), path).not.toContain(forbidden);
      }
    }
  });

  it('does not call the legacy Gemini object detection Edge Function from the active admin flow', () => {
    const autoPanel = String(
      sourceFiles[
        '/src/features/admin/aiRegistration/AutoAiRegistrationPanel.tsx'
      ],
    );
    const api = String(sourceFiles['/src/features/admin/aiRegistration/api.ts']);

    expect(autoPanel).not.toContain('detect-inventory-items');
    expect(api).not.toContain('detect-inventory-items');
  });
});
