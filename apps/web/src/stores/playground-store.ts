import { create } from 'zustand';

interface PlaygroundState {
  uf: string;
  municipio: string;
  coIes: number | null;
  iesLabel: string;
  coCurso: number | null;
  cursoLabel: string;
  setUf: (uf: string) => void;
  setMunicipio: (municipio: string) => void;
  /** Preenche UF/município sem limpar IES/curso (ex.: após seleção por CNPJ). */
  hydrateLocation: (uf?: string | null, municipio?: string | null) => void;
  setIes: (coIes: number | null, label?: string) => void;
  setCurso: (coCurso: number | null, label?: string) => void;
  reset: () => void;
}

const initial = {
  uf: '',
  municipio: '',
  coIes: null as number | null,
  iesLabel: '',
  coCurso: null as number | null,
  cursoLabel: '',
};

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  ...initial,
  setUf: (uf) =>
    set({
      uf,
      municipio: '',
      coIes: null,
      iesLabel: '',
      coCurso: null,
      cursoLabel: '',
    }),
  setMunicipio: (municipio) =>
    set({
      municipio,
      coIes: null,
      iesLabel: '',
      coCurso: null,
      cursoLabel: '',
    }),
  hydrateLocation: (nextUf, nextMunicipio) =>
    set((s) => ({
      uf: s.uf || nextUf || '',
      municipio: s.municipio || nextMunicipio || '',
    })),
  setIes: (coIes, label = '') =>
    set({
      coIes,
      iesLabel: label,
      coCurso: null,
      cursoLabel: '',
    }),
  setCurso: (coCurso, label = '') =>
    set({
      coCurso,
      cursoLabel: label,
    }),
  reset: () => set(initial),
}));
