'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiKeyListItem, CreatedApiKey } from '@/types/api';

const fieldClass =
  'min-w-[220px] flex-1 rounded-md border border-white/15 bg-[#12201b] px-3 py-2 text-sm text-stone-100 outline-none transition hover:border-white/30 focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-400/30';

function maskKey(value: string) {
  if (value.length <= 4) return '••••';
  return `${value.slice(0, 4)}${'•'.repeat(Math.min(value.length - 4, 12))}…`;
}

function displayValue(key: ApiKeyListItem) {
  return key.key ?? key.keyPrefix;
}

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const [name, setName] = useState('Minha app');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedPrefixes, setRevealedPrefixes] = useState<
    Record<string, boolean>
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function togglePrefix(id: string) {
    setRevealedPrefixes((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function copyKey(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 1500);
    } catch {
      setError('Não foi possível copiar a key');
    }
  }

  const keysQuery = useQuery({
    queryKey: ['api-keys'],
    queryFn: () =>
      apiFetch<ApiKeyListItem[]>('/me/api-keys', { accessToken }),
  });

  const createMutation = useMutation({
    mutationFn: (keyName: string) =>
      apiFetch<CreatedApiKey>('/me/api-keys', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ name: keyName }),
      }),
    onSuccess: (data) => {
      setCreatedKey(data.key);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar key');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/me/api-keys/${id}`, {
        method: 'DELETE',
        accessToken,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate(name);
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">
        Gerencie suas API Keys
      </h2>
      <p className="mt-2 text-sm text-stone-400">
        Você precisa de API Keys para acessar nossos endpoints. Recomendamos
        criar uma key por app ou site. Use o header{' '}
        <code className="text-stone-300">X-API-Key</code>.
      </p>

      <form onSubmit={onCreate} className="mt-6 flex flex-wrap gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
          placeholder="Nome da key"
          required
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-60"
        >
          Criar key
        </button>
      </form>

      {createdKey ? (
        <div className="mt-4 rounded-md border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium">Key criada — você também pode revelá-la na tabela:</p>
          <code className="mt-2 block break-all text-amber-50">{createdKey}</code>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

      <div className="mt-8 overflow-x-auto rounded-md border border-white/10">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-white/10 text-stone-400">
            <tr>
              <th className="px-4 py-3 font-medium">Label</th>
              <th className="px-4 py-3 font-medium">API Key</th>
              <th className="px-4 py-3 font-medium">Criada em</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {(keysQuery.data ?? []).map((key) => {
              const revealed = Boolean(revealedPrefixes[key.id]);
              const value = displayValue(key);
              return (
                <tr key={key.id}>
                  <td className="px-4 py-3 text-xs text-stone-100">
                    {key.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="max-w-[min(100%,28rem)] break-all font-mono text-xs text-stone-300">
                        {revealed ? value : maskKey(value)}
                      </code>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-400 transition hover:bg-white/5 hover:text-white"
                        onClick={() => togglePrefix(key.id)}
                      >
                        {revealed ? (
                          <>
                            <EyeOff className="size-3.5" aria-hidden />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <Eye className="size-3.5" aria-hidden />
                            Show
                          </>
                        )}
                      </button>
                      {revealed ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-400 transition hover:bg-white/5 hover:text-white"
                          onClick={() => void copyKey(key.id, value)}
                        >
                          {copiedId === key.id ? (
                            <>
                              <Check className="size-3.5 text-emerald-400" aria-hidden />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" aria-hidden />
                              Copiar
                            </>
                          )}
                        </button>
                      ) : null}
                      {key.revokedAt ? (
                        <span className="text-xs text-red-400">revogada</span>
                      ) : (
                        <span className="text-xs text-emerald-400">ativa</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-400">
                    {new Date(key.createdAt).toLocaleString('pt-BR', {
                      timeZone: 'UTC',
                    })}{' '}
                    UTC
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!key.revokedAt ? (
                      <button
                        type="button"
                        className="text-xs text-red-400 underline-offset-4 hover:text-red-300 hover:underline"
                        onClick={() => revokeMutation.mutate(key.id)}
                      >
                        Revogar
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {keysQuery.isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-stone-500">
                  Carregando…
                </td>
              </tr>
            ) : null}
            {!keysQuery.isLoading && (keysQuery.data?.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-stone-500">
                  Nenhuma key ainda. Crie a primeira acima.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
