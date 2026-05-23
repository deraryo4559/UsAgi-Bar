import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getProfileForSession, isAdminProfile } from './api/profiles';
import { hasSupabaseConfig, supabase } from '../../lib/supabase/client';
import { toErrorMessage } from '../../lib/supabase/errors';
import type { Profile } from '../../types/database';

export function useAdminSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(hasSupabaseConfig);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return;
    }

    let isMounted = true;

    async function loadSession(nextSession: Session | null) {
      setError(null);
      setSession(nextSession);

      if (!nextSession) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        const nextProfile = await getProfileForSession(nextSession);

        if (isMounted) {
          setProfile(nextProfile);
        }
      } catch (nextError) {
        if (isMounted) {
          setProfile(null);
          setError(toErrorMessage(nextError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        void loadSession(data.session);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setIsLoading(true);
        void loadSession(nextSession);
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    profile,
    isAdmin: isAdminProfile(profile),
    isLoading,
    error,
    hasSupabaseConfig,
  };
}
