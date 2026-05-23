import { createClient } from 'npm:@supabase/supabase-js@2';

export class AdminAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AdminAuthError';
    this.status = status;
  }
}

export function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new AdminAuthError(`${name} is not configured.`, 500);
  }

  return value;
}

export function getSupabaseApiKey() {
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (anonKey) {
    return anonKey;
  }

  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY');

  if (publishableKey) {
    return publishableKey;
  }

  throw new AdminAuthError(
    'SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY is not configured.',
    500,
  );
}

export async function requireAdmin(req: Request) {
  const authorization = req.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    throw new AdminAuthError('ログインが必要です。', 401);
  }

  const supabase = createAuthedSupabaseClient(authorization);

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new AdminAuthError('ログイン状態を確認できません。', 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    throw new AdminAuthError('管理者権限の確認に失敗しました。', 403);
  }

  if (profile?.role !== 'admin') {
    throw new AdminAuthError(
      "このアカウントには管理者権限がありません。profiles.role='admin' を確認してください。",
      403,
    );
  }

  return {
    userId: userData.user.id,
    email: userData.user.email ?? null,
  };
}

export function createAuthedSupabaseClient(authorization: string) {
  return createClient(getRequiredEnv('SUPABASE_URL'), getSupabaseApiKey(), {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
}
