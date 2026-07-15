const iesItem = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  anoCenso: 2023,
  coIes: 1,
  noIes: 'UNIVERSIDADE DE SÃO PAULO',
  sgIes: 'USP',
  organizacaoAcademica: 'Universidade',
  rede: 'Pública',
  categoriaAdministrativa: 'Federal',
  sgUf: 'SP',
  noMunicipio: 'São Paulo',
  coMunicipio: 3550308,
  noMantenedora: 'UNIVERSIDADE DE SÃO PAULO',
  cnpj: '63025530000104',
};

const cursoItem = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  anoCenso: 2023,
  coCurso: 1001,
  coIes: 1,
  noCurso: 'DIREITO',
  grau: 'Bacharelado',
  modalidade: 'Presencial',
  sgUf: 'SP',
  noMunicipio: 'São Paulo',
  coMunicipio: 3550308,
};

export const OPENAPI_EXAMPLES = {
  ufs: ['AC', 'AL', 'AM', 'BA', 'SP'],
  municipios: ['Campinas', 'Guarulhos', 'São Paulo'],
  iesPage: {
    data: [iesItem],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
  iesByCnpj: {
    data: [iesItem],
    total: 1,
  },
  iesDetail: iesItem,
  cursosPage: {
    data: [cursoItem],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
} as const;
