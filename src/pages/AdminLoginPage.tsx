import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MascotBubble } from '../components/ui/MascotBubble';
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
    <AppShell title="管理者ログイン" backTo="/" variant="admin">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <MascotBubble size="md" variant="card">
          管理者だけが入れるバックヤードだ。メールとパスワードで入ってくれ。
        </MascotBubble>

        <Card>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-1 text-sm font-semibold text-cream-50">
              メールアドレス
              <input
                className="rounded-xl border border-night-gold/30 bg-black/35 px-3 py-2 text-sm font-normal text-cream-50 shadow-chip focus:border-night-neon focus:outline-none focus:ring-2 focus:ring-night-neon/25"
                autoComplete="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-cream-50">
              パスワード
              <input
                className="rounded-xl border border-night-gold/30 bg-black/35 px-3 py-2 text-sm font-normal text-cream-50 shadow-chip focus:border-night-neon focus:outline-none focus:ring-2 focus:ring-night-neon/25"
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {message ? <Alert tone="warn">{message}</Alert> : null}
            <Button
              type="submit"
              variant="accent"
              disabled={isSubmitting || isSessionLoading}
            >
              {isSubmitting || isSessionLoading ? '確認中…' : 'ログイン'}
            </Button>
            <Link
              to="/"
              className="text-center text-xs font-semibold text-cream-200/60 hover:text-cream-50"
            >
              ← 酒棚へ戻る
            </Link>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
