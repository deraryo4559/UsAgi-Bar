import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

type SupabaseConfigIssue =
  | 'missing_url'
  | 'missing_anon_key'
  | 'invalid_url'
  | 'url_must_be_project_root'
  | null;

function getProjectUrl(rawUrl: string | undefined) {
  if (!rawUrl) {
    return { issue: 'missing_url' as const, url: null };
  }

  try {
    const parsed = new URL(rawUrl);

    if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
      return { issue: 'url_must_be_project_root' as const, url: null };
    }

    return { issue: null, url: parsed.origin };
  } catch {
    return { issue: 'invalid_url' as const, url: null };
  }
}

const projectUrl = getProjectUrl(rawSupabaseUrl);

export const supabaseConfigIssue: SupabaseConfigIssue =
  projectUrl.issue ?? (!supabaseAnonKey ? 'missing_anon_key' : null);
export const hasSupabaseConfig = !supabaseConfigIssue;

export function getSupabaseConfigErrorMessage() {
  switch (supabaseConfigIssue) {
    case 'missing_url':
      return 'Supabase接続情報が未設定です。.env に VITE_SUPABASE_URL を設定してください。';
    case 'missing_anon_key':
      return 'Supabase接続情報が未設定です。.env に VITE_SUPABASE_ANON_KEY を設定してください。';
    case 'invalid_url':
      return 'VITE_SUPABASE_URL の形式が正しくありません。Supabase Project URLを設定してください。';
    case 'url_must_be_project_root':
      return 'VITE_SUPABASE_URL には /rest/v1 などを含めず、Supabase Project URLのルートを設定してください。';
    case null:
      return null;
  }
}

if (!hasSupabaseConfig) {
  console.warn(
    getSupabaseConfigErrorMessage() ??
      'Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Auth and DB calls.',
  );
}

export const supabase = createClient<Database>(
  projectUrl.url || 'https://example.supabase.co',
  supabaseAnonKey || 'local-anon-key',
);
