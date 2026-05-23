import { toErrorMessage } from '../../../lib/supabase/errors';

export function toAiRegistrationErrorMessage(error: unknown) {
  const message = toErrorMessage(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('gemini_api_key')) {
    return `${message}\n確認: Supabase Edge Function Secret に GEMINI_API_KEY を設定してください。フロントエンドには設定しません。`;
  }

  if (
    normalized.includes('failed to send a request') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('function not found') ||
    normalized.includes('not found') ||
    normalized.includes('404')
  ) {
    return `${message}\n確認: analyze-inventory-image Edge Function がSupabaseプロジェクトにdeployされているか確認してください。未deployの場合、Supabaseは Requested function was not found を返します。`;
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
