import { describe, expect, it } from 'vitest';
import {
  isAiQuotaOrRateLimitError,
  toAiRegistrationErrorMessage,
} from './aiRegistrationErrors';

describe('toAiRegistrationErrorMessage', () => {
  it('adds a deployment hint for Edge Function fetch failures', () => {
    expect(
      toAiRegistrationErrorMessage(
        new Error('Failed to send a request to the Edge Function'),
      ),
    ).toContain('deploy');
  });

  it('uses the provided Edge Function name in deployment hints', () => {
    expect(
      toAiRegistrationErrorMessage(
        new Error('Failed to send a request to the Edge Function'),
        'detect-inventory-items',
      ),
    ).toContain('detect-inventory-items');
  });

  it('adds a secret hint for missing Gemini key errors', () => {
    expect(
      toAiRegistrationErrorMessage(new Error('GEMINI_API_KEY が設定されていません。')),
    ).toContain('GEMINI_API_KEY');
  });

  it('adds a secret hint for missing Cloudflare key errors', () => {
    expect(
      toAiRegistrationErrorMessage(
        new Error('CLOUDFLARE_API_TOKEN が設定されていません。'),
      ),
    ).toContain('CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN');
  });

  it('adds a model hint for Cloudflare image input model errors', () => {
    expect(
      toAiRegistrationErrorMessage(
        new Error(
          'Cloudflare Workers AI呼び出しに失敗しました。status=400 {"errors":[{"message":"AiError: Model input is not valid: input tensor `image` is not present in the model","code":3030}]}',
        ),
      ),
    ).toContain('img2img対応モデル');
  });

  it('detects Gemini quota and rate limit errors before generic Gemini hints', () => {
    const error = new Error(
      'Gemini API呼び出しに失敗しました。status=429 You exceeded your current quota',
    );

    expect(isAiQuotaOrRateLimitError(error)).toBe(true);
    expect(toAiRegistrationErrorMessage(error)).toContain('無料枠');
  });
});
