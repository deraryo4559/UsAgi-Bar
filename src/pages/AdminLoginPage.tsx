import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { useAdminSession } from '../features/auth/useAdminSession';
import {
  getSupabaseConfigErrorMessage,
  hasSupabaseConfig,
  supabase,
} from '../lib/supabase/client';
import { toErrorMessage } from '../lib/supabase/errors';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { session, isLoading: isSessionLoading } = useAdminSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isSessionLoading && session) {
      navigate('/admin', { replace: true });
    }
  }, [isSessionLoading, navigate, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!hasSupabaseConfig) {
      setMessage(
        getSupabaseConfigErrorMessage() ??
          '.env に Supabase のURLとAnon Keyを設定してください。',
      );
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsSubmitting(false);

    if (error) {
      setMessage(toErrorMessage(error));
      return;
    }

    navigate('/admin');
  }

  return (
    <AppShell title="管理者ログイン">
      <form
        onSubmit={handleSubmit}
        className="mx-auto grid w-full max-w-md gap-4 rounded border border-stone-200 bg-white p-5"
      >
        <label className="grid gap-1 text-sm font-medium">
          メールアドレス
          <input
            className="rounded border border-stone-300 px-3 py-2"
            autoComplete="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          パスワード
          <input
            className="rounded border border-stone-300 px-3 py-2"
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {message ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {message}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting || isSessionLoading}>
          {isSubmitting || isSessionLoading ? '確認中' : 'ログイン'}
        </Button>
        <Link
          to="/"
          className="text-center text-sm font-medium text-stone-500 hover:text-stone-900"
        >
          酒棚へ戻る
        </Link>
      </form>
    </AppShell>
  );
}
