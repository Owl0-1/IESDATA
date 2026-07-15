export const TP_ORGANIZACAO_ACADEMICA: Record<number, string> = {
  1: 'Universidade',
  2: 'Centro Universitário',
  3: 'Faculdade',
  4: 'Instituto Federal',
  5: 'CEFET',
};

export const TP_REDE: Record<number, string> = {
  1: 'Pública',
  2: 'Privada',
};

export const TP_CATEGORIA_ADMINISTRATIVA: Record<number, string> = {
  1: 'Pública Federal',
  2: 'Pública Estadual',
  3: 'Pública Municipal',
  4: 'Privada com fins lucrativos',
  5: 'Privada sem fins lucrativos',
  6: 'Privada particular em sentido estrito',
  7: 'Especial',
  8: 'Privada comunitária',
  9: 'Privada confessional',
};

export const TP_GRAU_ACADEMICO: Record<number, string> = {
  0: 'Não aplicável',
  1: 'Bacharelado',
  2: 'Licenciatura',
  3: 'Tecnológico',
  4: 'Bacharelado e Licenciatura',
};

export const TP_MODALIDADE_ENSINO: Record<number, string> = {
  1: 'Presencial',
  2: 'EAD',
};

export function decodeLabel(
  map: Record<number, string>,
  code: number | null,
): string | null {
  if (code === null) return null;
  return map[code] ?? null;
}
