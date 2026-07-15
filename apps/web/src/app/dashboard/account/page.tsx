'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type {
  AuthSessionResponse,
  AuthUser,
  UsageSummary,
} from '@/types/api';

const fieldClass =
  'mt-1.5 w-full rounded-md border border-white/15 bg-[#12201b] px-3 py-2 text-sm text-stone-100 outline-none transition hover:border-white/30 focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-400/30';

type Panel = 'email' | 'password' | 'delete' | null;

export default function AccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<AuthUser>('/me', { accessToken }),
  });

  const usageQuery = useQuery({
    queryKey: ['usage', 30],
    queryFn: () =>
      apiFetch<UsageSummary>('/me/usage?days=30', { accessToken }),
  });

  const emailMutation = useMutation({
    mutationFn: () =>
      apiFetch<AuthSessionResponse>('/me/email', {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({ email, currentPassword }),
      }),
    onSuccess: (data) => {
      setSession(
        { accessToken: data.accessToken, refreshToken: data.refreshToken },
        data.user,
      );
      setPanel(null);
      setError(null);
      setCurrentPassword('');
      setEmail('');
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Erro ao alterar e-mail');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      apiFetch<AuthSessionResponse>('/me/password', {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: (data) => {
      setSession(
        { accessToken: data.accessToken, refreshToken: data.refreshToken },
        data.user,
      );
      setPanel(null);
      setError(null);
      setCurrentPassword('');
      setNewPassword('');
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Erro ao alterar senha');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ deleted: true }>('/me', {
        method: 'DELETE',
        accessToken,
        body: JSON.stringify({ currentPassword }),
      }),
    onSuccess: () => {
      clearSession();
      router.replace('/login');
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Erro ao excluir conta');
    },
  });

  const user = meQuery.data;
  const usage = usageQuery.data;

  function openPanel(next: Panel) {
    setPanel(next);
    setError(null);
    setCurrentPassword('');
    setNewPassword('');
    setEmail(user?.email ?? '');
    setDeleteConfirm('');
  }

  function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    emailMutation.mutate();
  }

  function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    passwordMutation.mutate();
  }

  function onDeleteSubmit(e: FormEvent) {
    e.preventDefault();
    if (deleteConfirm !== user?.email) {
      setError('Digite o e-mail da conta para confirmar');
      return;
    }
    deleteMutation.mutate();
  }

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Nome', value: user?.name ?? '—' },
    {
      label: 'Requests',
      value:
        usage != null ? (
          <span>
            {usage.requestsToday.toLocaleString('pt-BR')}
            <span className="text-stone-500">
              {' '}
              / {usage.quotaDaily.toLocaleString('pt-BR')}
            </span>
            <span className="mt-0.5 block text-xs text-stone-500">
              hoje · limite por conta ·{' '}
              {usage.remainingToday.toLocaleString('pt-BR')} restantes
            </span>
          </span>
        ) : usageQuery.isError ? (
          <span className="text-red-400">Falha ao carregar uso</span>
        ) : (
          '—'
        ),
    },
    { label: 'Reset period', value: usage?.resetPeriod ?? 'Daily' },
    { label: 'Payment period', value: usage?.paymentPeriod ?? 'None' },
    {
      label: 'Email',
      value: (
        <span className="inline-flex flex-wrap items-center gap-2">
          <span>{user?.email ?? '—'}</span>
          <button
            type="button"
            className="text-emerald-300/90 underline-offset-4 hover:underline"
            onClick={() => openPanel('email')}
          >
            Alterar e-mail
          </button>
        </span>
      ),
    },
    {
      label: 'Password',
      value: (
        <button
          type="button"
          className="text-emerald-300/90 underline-offset-4 hover:underline"
          onClick={() => openPanel('password')}
        >
          Alterar senha
        </button>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Detalhes da conta</h2>
      <p className="mt-2 text-sm text-stone-400">
        Dados do perfil, quota e segurança da conta.
      </p>

      {(meQuery.isLoading || usageQuery.isLoading) && (
        <p className="mt-8 text-sm text-stone-500">Carregando…</p>
      )}

      <dl className="mt-8 divide-y divide-white/10 border-y border-white/10">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-1 px-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4"
          >
            <dt className="text-sm text-stone-500">{row.label}</dt>
            <dd className="text-sm text-stone-100">{row.value}</dd>
          </div>
        ))}
      </dl>

      {panel === 'email' ? (
        <form
          onSubmit={onEmailSubmit}
          className="mt-6 max-w-md space-y-3 rounded-md border border-white/10 p-4"
        >
          <p className="text-sm font-medium">Alterar e-mail</p>
          <label className="block text-sm text-stone-300">
            Novo e-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm text-stone-300">
            Senha atual
            <input
              type="password"
              required
              minLength={8}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={fieldClass}
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={emailMutation.isPending}
              className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-300 disabled:opacity-60"
            >
              Salvar
            </button>
            <button
              type="button"
              className="text-sm text-stone-400 hover:text-white"
              onClick={() => setPanel(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {panel === 'password' ? (
        <form
          onSubmit={onPasswordSubmit}
          className="mt-6 max-w-md space-y-3 rounded-md border border-white/10 p-4"
        >
          <p className="text-sm font-medium">Alterar senha</p>
          <label className="block text-sm text-stone-300">
            Senha atual
            <input
              type="password"
              required
              minLength={8}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm text-stone-300">
            Nova senha
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={fieldClass}
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-300 disabled:opacity-60"
            >
              Salvar
            </button>
            <button
              type="button"
              className="text-sm text-stone-400 hover:text-white"
              onClick={() => setPanel(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <p className="mt-10 text-center text-sm text-stone-500">
        Para excluir permanentemente sua conta,{' '}
        <button
          type="button"
          className="text-red-400 underline-offset-4 hover:underline"
          onClick={() => openPanel('delete')}
        >
          clique aqui
        </button>
        .
      </p>

      {panel === 'delete' ? (
        <form
          onSubmit={onDeleteSubmit}
          className="mx-auto mt-4 max-w-md space-y-3 rounded-md border border-red-400/30 bg-red-500/5 p-4"
        >
          <p className="text-sm font-medium text-red-200">
            Excluir conta permanentemente
          </p>
          <p className="text-xs text-stone-400">
            Isso remove suas API Keys e histórico de uso. Digite{' '}
            <strong className="text-stone-200">{user?.email}</strong> e a senha
            atual para confirmar.
          </p>
          <label className="block text-sm text-stone-300">
            Confirmar e-mail
            <input
              type="email"
              required
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm text-stone-300">
            Senha atual
            <input
              type="password"
              required
              minLength={8}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={fieldClass}
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={deleteMutation.isPending}
              className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400 disabled:opacity-60"
            >
              Excluir conta
            </button>
            <button
              type="button"
              className="text-sm text-stone-400 hover:text-white"
              onClick={() => setPanel(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
