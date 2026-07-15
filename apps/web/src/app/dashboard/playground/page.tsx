'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchableSelect } from '@/components/searchable-select';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { apiFetch } from '@/lib/api';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { UFS } from '@/lib/ufs';
import { usePlaygroundStore } from '@/stores/playground-store';
import type { CursoSummary, IesSummary, PaginatedResult } from '@/types/api';

const fieldClass =
  'mt-1.5 w-full rounded-md border border-white/15 bg-[#12201b] px-3 py-2 text-sm text-stone-100 outline-none transition hover:border-white/30 focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-50';

/** Dados censitários: cache longo, sem refetch ao focar a aba. */
const playgroundQueryOptions = {
  staleTime: 10 * 60_000,
  refetchOnWindowFocus: false as const,
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function formatCnpjInput(value: string): string {
  const d = digitsOnly(value).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function matchesSearch(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

export default function PlaygroundPage() {
  const [apiKey, setApiKey] = useState('');
  const [cnpjInput, setCnpjInput] = useState('');
  const {
    uf,
    municipio,
    coIes,
    iesLabel,
    coCurso,
    cursoLabel,
    setUf,
    setMunicipio,
    hydrateLocation,
    setIes,
    setCurso,
  } = usePlaygroundStore();
  const [iesSearch, setIesSearch] = useState('');
  const [cursoSearch, setCursoSearch] = useState('');
  const debouncedCnpj = useDebouncedValue(digitsOnly(cnpjInput), 300);
  const cnpjReady = debouncedCnpj.length === 14;
  const locationReady = Boolean(uf && municipio);
  const canLoadIes = Boolean(apiKey && (cnpjReady || locationReady));

  const municipiosQuery = useQuery({
    queryKey: ['municipios', apiKey, uf],
    enabled: Boolean(apiKey && uf),
    ...playgroundQueryOptions,
    queryFn: ({ signal }) =>
      apiFetch<string[]>(`/v1/municipios?uf=${encodeURIComponent(uf)}`, {
        apiKey,
        signal,
      }),
  });

  // CNPJ no queryKey quando ativo — hidratar UF/município não dispara refetch.
  const iesQueryKey = cnpjReady
    ? (['ies-all', apiKey, 'cnpj', debouncedCnpj] as const)
    : (['ies-all', apiKey, 'loc', uf, municipio] as const);

  const iesQuery = useQuery({
    queryKey: iesQueryKey,
    enabled: canLoadIes,
    ...playgroundQueryOptions,
    queryFn: async ({ signal }) => {
      return fetchAllPages((page, limit) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (cnpjReady) {
          params.set('cnpj', debouncedCnpj);
        } else {
          params.set('uf', uf);
          params.set('municipio', municipio);
        }
        return apiFetch<PaginatedResult<IesSummary>>(`/v1/ies?${params}`, {
          apiKey,
          signal,
        });
      }, signal);
    },
  });

  const cursosQuery = useQuery({
    queryKey: ['cursos-all', apiKey, coIes],
    enabled: Boolean(apiKey && coIes),
    ...playgroundQueryOptions,
    queryFn: async ({ signal }) => {
      return fetchAllPages((page, limit) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        return apiFetch<PaginatedResult<CursoSummary>>(
          `/v1/ies/${coIes}/cursos?${params}`,
          { apiKey, signal },
        );
      }, signal);
    },
  });

  const iesOptions = useMemo(() => {
    const items = iesQuery.data ?? [];
    return items
      .filter((item) => {
        const label = item.sgIes ? `${item.noIes} (${item.sgIes})` : item.noIes;
        return matchesSearch(
          [label, item.cnpj, item.noMunicipio, item.sgUf]
            .filter(Boolean)
            .join(' '),
          iesSearch,
        );
      })
      .map((item) => ({
        value: String(item.coIes),
        label: item.sgIes ? `${item.noIes} (${item.sgIes})` : item.noIes,
        hint: [
          item.rede,
          item.cnpj
            ? `CNPJ ${item.cnpj.replace(
                /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                '$1.$2.$3/$4-$5',
              )}`
            : null,
          item.sgUf && item.noMunicipio
            ? `${item.noMunicipio}/${item.sgUf}`
            : null,
        ]
          .filter(Boolean)
          .join(' · '),
      }));
  }, [iesQuery.data, iesSearch]);

  const cursoOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string; hint?: string }[] = [];
    for (const item of cursosQuery.data ?? []) {
      if (
        !matchesSearch(
          [item.noCurso, item.grau, item.modalidade].filter(Boolean).join(' '),
          cursoSearch,
        )
      ) {
        continue;
      }
      const key =
        item.id ?? `${item.coCurso}-${item.noCurso}-${item.modalidade ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({
        value: key,
        label: item.noCurso,
        hint:
          [item.grau, item.modalidade].filter(Boolean).join(' · ') || undefined,
      });
    }
    return options;
  }, [cursosQuery.data, cursoSearch]);

  const selectedIesCnpj = useMemo(() => {
    if (!coIes) return null;
    return (iesQuery.data ?? []).find((item) => item.coIes === coIes)?.cnpj ?? null;
  }, [coIes, iesQuery.data]);

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Playground</h2>
      <p className="mt-2 text-sm text-stone-400">
        Cole uma API Key e explore UF → município → IES → curso (ou busque por
        CNPJ).
      </p>

      <label className="mt-6 block text-sm font-medium text-stone-200">
        API Key
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value.trim())}
          className={`${fieldClass} font-mono text-xs`}
          placeholder="ies_live_..."
        />
      </label>

      <div className="mt-6 grid gap-5">
        <label className="block text-sm font-medium text-stone-200">
          CNPJ da mantenedora{' '}
          <span className="font-normal text-stone-400">(opcional)</span>
          <input
            value={cnpjInput}
            onChange={(e) => {
              setCnpjInput(formatCnpjInput(e.target.value));
              setIes(null, '');
              setCursoSearch('');
            }}
            className={`${fieldClass} font-mono tracking-wide`}
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
          />
          <span className="mt-1 block text-xs font-normal text-stone-400">
            Com CNPJ válido, UF e município deixam de ser obrigatórios.
          </span>
        </label>

        <label className="block text-sm font-medium text-stone-200">
          UF {cnpjReady ? '(opcional)' : '*'}
          <select
            value={uf}
            disabled={!apiKey}
            onChange={(e) => {
              setUf(e.target.value);
              setCnpjInput('');
              setIesSearch('');
              setCursoSearch('');
            }}
            className={fieldClass}
          >
            <option value="">Selecione</option>
            {UFS.map((item) => (
              <option key={item} value={item} className="bg-[#12201b]">
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-stone-200">
          Município {cnpjReady ? '(opcional)' : '*'}
          <select
            value={municipio}
            disabled={!uf || municipiosQuery.isLoading}
            onChange={(e) => {
              setMunicipio(e.target.value);
              setCnpjInput('');
              setIesSearch('');
              setCursoSearch('');
            }}
            className={fieldClass}
          >
            <option value="">Selecione</option>
            {(municipiosQuery.data ?? []).map((item) => (
              <option key={item} value={item} className="bg-[#12201b]">
                {item}
              </option>
            ))}
          </select>
        </label>

        <SearchableSelect
          label="Universidade *"
          placeholder={
            canLoadIes
              ? 'Clique para ver todas ou digite para filtrar'
              : cnpjInput
                ? 'Informe um CNPJ completo (14 dígitos)'
                : 'Selecione UF e município, ou informe CNPJ'
          }
          value={coIes !== null ? String(coIes) : null}
          selectedLabel={iesLabel}
          options={iesOptions}
          total={iesQuery.data?.length}
          disabled={!canLoadIes}
          loading={iesQuery.isFetching}
          onSearchChange={setIesSearch}
          onSelect={(value, label) => {
            const selected = (iesQuery.data ?? []).find(
              (item) => String(item.coIes) === value,
            );
            if (selected) {
              hydrateLocation(selected.sgUf, selected.noMunicipio);
            }
            setIes(value ? Number(value) : null, label);
            setCursoSearch('');
            if (!value) setIesSearch('');
          }}
        />

        <SearchableSelect
          label="Curso"
          placeholder="Clique para ver todos ou digite para filtrar"
          value={
            coCurso !== null
              ? (cursoOptions.find((o) => o.label === cursoLabel)?.value ??
                String(coCurso))
              : null
          }
          selectedLabel={cursoLabel}
          options={cursoOptions}
          total={cursosQuery.data?.length}
          disabled={!coIes}
          loading={cursosQuery.isFetching}
          onSearchChange={setCursoSearch}
          onSelect={(value, label) => {
            if (!value) {
              setCurso(null, '');
              return;
            }
            const selected = (cursosQuery.data ?? []).find((item) => {
              const key =
                item.id ??
                `${item.coCurso}-${item.noCurso}-${item.modalidade ?? ''}`;
              return key === value;
            });
            setCurso(selected?.coCurso ?? null, label);
          }}
        />
      </div>

      {(municipiosQuery.isError || iesQuery.isError || cursosQuery.isError) && (
        <p className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {(municipiosQuery.error ?? iesQuery.error ?? cursosQuery.error) instanceof
          Error
            ? (
                municipiosQuery.error ??
                iesQuery.error ??
                cursosQuery.error
              )!.message
            : 'Falha ao consultar a API'}
        </p>
      )}

      {(iesLabel || cursoLabel) && (
        <p className="mt-8 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-300">
          Seleção: {[uf, municipio, iesLabel, cursoLabel]
            .filter(Boolean)
            .join(' / ')}
          {cnpjReady
            ? ` · CNPJ ${formatCnpjInput(debouncedCnpj)}`
            : selectedIesCnpj
              ? ` · CNPJ ${formatCnpjInput(selectedIesCnpj)}`
              : ''}
        </p>
      )}
    </div>
  );
}
