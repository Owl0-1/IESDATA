'use client';

import { useQuery } from '@tanstack/react-query';
import { UsageChart } from '@/components/dashboard/usage-chart';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { UsageSummary } from '@/types/api';

function formatNumber(n: number) {
  return n.toLocaleString('pt-BR');
}

export default function AnalyticsPage() {
  const accessToken = useAuthStore((s) => s.accessToken)!;

  const usageQuery = useQuery({
    queryKey: ['usage', 30],
    queryFn: () =>
      apiFetch<UsageSummary>('/me/usage?days=30', { accessToken }),
  });

  const data = usageQuery.data;
  const pct =
    data && data.quotaDaily > 0
      ? Math.min(100, Math.round((data.requestsToday / data.quotaDaily) * 100))
      : 0;

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Análise de uso</h2>
      <p className="mt-2 text-sm text-stone-400">
        Acompanhe o volume de requests nas rotas públicas autenticadas com API
        Key. O limite diário é por conta (padrão 2.000), compartilhado entre
        todas as suas API Keys.
      </p>

      {usageQuery.isLoading ? (
        <p className="mt-8 text-sm text-stone-500">Carregando…</p>
      ) : null}

      {data ? (
        <div className="mt-8 space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-white/10 px-4 py-3">
              <p className="text-xs tracking-wide text-stone-500 uppercase">
                Hoje
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatNumber(data.requestsToday)}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                de {formatNumber(data.quotaDaily)} ({pct}%)
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-[width] duration-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="rounded-md border border-white/10 px-4 py-3">
              <p className="text-xs tracking-wide text-stone-500 uppercase">
                Reset
              </p>
              <p className="mt-1 text-2xl font-semibold">{data.resetPeriod}</p>
              <p className="mt-1 text-xs text-stone-500">Período de contagem</p>
            </div>
            <div className="rounded-md border border-white/10 px-4 py-3">
              <p className="text-xs tracking-wide text-stone-500 uppercase">
                Pagamento
              </p>
              <p className="mt-1 text-2xl font-semibold">{data.paymentPeriod}</p>
              <p className="mt-1 text-xs text-stone-500">Plano atual</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-stone-200">
              Requests por dia (30 dias)
            </h3>
            <UsageChart series={data.series} />
          </div>

          <div>
            <h3 className="text-sm font-medium text-stone-200">
              Uso por API Key (hoje)
            </h3>
            <div className="mt-3 overflow-x-auto rounded-md border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-stone-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Key</th>
                    <th className="px-4 py-3 font-medium">Requests</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.byKey.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-stone-500">
                        Nenhuma request contabilizada hoje.
                      </td>
                    </tr>
                  ) : (
                    data.byKey.map((row) => (
                      <tr key={row.apiKeyId}>
                        <td className="px-4 py-3">{row.name}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatNumber(row.count)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
