import { describe, expect, it } from 'vitest';
import { toAiRegistrationErrorMessage } from './aiRegistrationErrors';

describe('toAiRegistrationErrorMessage', () => {
  it('adds a deployment hint for Edge Function fetch failures', () => {
    expect(
      toAiRegistrationErrorMessage(
        new Error('Failed to send a request to the Edge Function'),
      ),
    ).toContain('deploy');
  });

  it('adds a secret hint for missing Gemini key errors', () => {
    expect(
      toAiRegistrationErrorMessage(new Error('GEMINI_API_KEY が設定されていません。')),
    ).toContain('GEMINI_API_KEY');
  });
});
