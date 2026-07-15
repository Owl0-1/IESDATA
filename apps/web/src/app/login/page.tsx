'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string };
}

const fieldClass =
  'mt-1 w-full rounded-md border border-white/15 bg-[#12201b] px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 outline-none transition hover:border-white/30 focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-400/30';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(
        { accessToken: data.accessToken, refreshToken: data.refreshToken },
        data.user,
      );
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha no login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16 text-stone-100">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="text-sm text-stone-400 underline-offset-4 transition hover:text-stone-200 hover:underline"
        >
          ← Voltar para home
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Entrar</h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-stone-200">
            E-mail
            <input
              type="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-medium text-stone-200">
            Senha
            <input
              type="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="mt-4 text-sm text-stone-400">
          Não tem conta?{' '}
          <Link
            href="/register"
            className="text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
