import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase/client';
import { ensureSupabaseConfig, toErrorMessage } from '../../../lib/supabase/errors';
import type { Profile } from '../../../types/database';

export async function getProfileByUserId(userId: string) {
  ensureSupabaseConfig();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(toErrorMessage(error));
  }

  return data;
}

export async function getProfileForSession(session: Session | null) {
  if (!session) {
    return null;
  }

  return getProfileByUserId(session.user.id);
}

export function isAdminProfile(profile: Profile | null) {
  return profile?.role === 'admin';
}
