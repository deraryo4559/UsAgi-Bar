import { toErrorMessage } from '../../../lib/supabase/errors';

export function isAiQuotaOrRateLimitError(error: unknown) {
  const normalized = toErrorMessage(error).toLowerCase();

  return (
    normalized.includes('429') ||
    normalized.includes('quota') ||
    normalized.includes('rate limit') ||
    normalized.includes('rate-limit') ||
    normalized.includes('resource_exhausted') ||
    normalized.includes('exceeded your current quota')
  );
}

export function toAiRegistrationErrorMessage(
  error: unknown,
  functionName = 'analyze-inventory-image',
) {
  const message = toErrorMessage(error);
  const normalized = message.toLowerCase();

  if (isAiQuotaOrRateLimitError(error)) {
    return `${message}\n確認: Gemini APIの無料枠またはレート制限に達しています。時間を置くか、Google AI Studioの使用量・課金設定を確認してください。候補作成は止めて、必要なら手入力で登録してください。`;
  }

  if (normalized.includes('gemini_api_key')) {
    return `${message}\n確認: Supabase Edge Function Secret に GEMINI_API_KEY を設定してください。フロントエンドには設定しません。`;
  }

  if (
    normalized.includes('model input is not valid') ||
    normalized.includes('input tensor') ||
    normalized.includes('code":3030')
  ) {
    return `${message}\n確認: Cloudflare Workers AIのモデルが画像入力に対応していない可能性があります。CLOUDFLARE_IMAGE_MODEL を設定している場合は、@cf/runwayml/stable-diffusion-v1-5-img2img のようなimg2img対応モデルにしてください。`;
  }

  if (
    (normalized.includes('cloudflare_account_id') ||
      normalized.includes('cloudflare_api_token')) &&
    (normalized.includes('設定されていません') ||
      normalized.includes('not configured'))
  ) {
    return `${message}\n確認: Supabase Edge Function Secret に CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN を設定してください。フロントエンドには設定しません。`;
  }

  if (
    normalized.includes('failed to send a request') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('function not found') ||
    normalized.includes('not found') ||
    normalized.includes('404')
  ) {
    return `${message}\n確認: ${functionName} Edge Function がSupabaseプロジェクトにdeployされているか確認してください。未deployの場合、Supabaseは Requested function was not found を返します。`;
  }

  if (
    normalized.includes('admin') ||
    normalized.includes('jwt') ||
    normalized.includes('401') ||
    normalized.includes('403')
  ) {
    return `${message}\n確認: ログイン状態と profiles.role=admin を確認してください。`;
  }

  if (
    normalized.includes('gemini') ||
    normalized.includes('json') ||
    normalized.includes('schema')
  ) {
    return `${message}\n確認: 画像の内容を見直すか、手入力登録に戻してください。`;
  }

  return message;
}
