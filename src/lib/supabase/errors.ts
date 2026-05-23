import { getSupabaseConfigErrorMessage, hasSupabaseConfig } from './client';

type ErrorLike = {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
};

export function ensureSupabaseConfig() {
  if (!hasSupabaseConfig) {
    throw new Error(
      getSupabaseConfigErrorMessage() ??
        'Supabase接続情報が未設定です。.env に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。',
    );
  }
}

function isErrorLike(error: unknown): error is ErrorLike {
  return typeof error === 'object' && error !== null;
}

function getRawErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (isErrorLike(error) && typeof error.message === 'string') {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '不明なエラーが発生しました。';
}

function getErrorCode(error: unknown) {
  if (isErrorLike(error) && typeof error.code === 'string') {
    return error.code;
  }

  return null;
}

function getErrorStatus(error: unknown) {
  if (isErrorLike(error) && typeof error.status === 'number') {
    return error.status;
  }

  return null;
}

function buildErrorHint(message: string, code: string | null, status: number | null) {
  const normalized = `${message} ${code ?? ''}`.toLowerCase();

  if (message.includes('Supabase接続情報が未設定')) {
    return '確認: .env またはGitHub Actionsの VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY を設定してください。';
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed')
  ) {
    return '確認: Supabase URL、ネットワーク接続、ブラウザのCORS/広告ブロック設定を確認してください。';
  }

  if (
    normalized.includes('invalid api key') ||
    normalized.includes('jwt') ||
    normalized.includes('api key')
  ) {
    return '確認: VITE_SUPABASE_ANON_KEY が対象プロジェクトの anon public key か確認してください。';
  }

  if (
    normalized.includes('row-level security') ||
    normalized.includes('violates row-level security') ||
    normalized.includes('permission denied') ||
    normalized.includes('42501') ||
    status === 401 ||
    status === 403
  ) {
    return '確認: ログイン状態、profiles.role=admin、RLS policyを確認してください。';
  }

  if (
    normalized.includes('bucket not found') ||
    normalized.includes('bucket') ||
    normalized.includes('storage')
  ) {
    return '確認: Storageの inventory-images バケット、公開設定、Storage policyを確認してください。';
  }

  if (
    normalized.includes('relation') &&
    normalized.includes('does not exist')
  ) {
    return '確認: Supabase migrationが未適用の可能性があります。0001_init.sql から適用してください。';
  }

  return null;
}

export function toErrorMessage(error: unknown) {
  const message = getRawErrorMessage(error);

  if (message.includes('確認:')) {
    return message;
  }

  const hint = buildErrorHint(message, getErrorCode(error), getErrorStatus(error));

  if (!hint) {
    return message;
  }

  return `${message}\n${hint}`;
}
