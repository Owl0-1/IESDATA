export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IesSummary {
  id?: string;
  coIes: number;
  noIes: string;
  sgIes: string | null;
  sgUf: string;
  noMunicipio: string | null;
  rede: string | null;
  organizacaoAcademica: string | null;
  cnpj?: string | null;
}

export interface CursoSummary {
  id?: string;
  coCurso: number;
  coIes: number;
  noCurso: string;
  grau: string | null;
  modalidade: string | null;
  coMunicipio?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  /** Key completa quando disponível (null em keys antigas só com hash). */
  key: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreatedApiKey extends ApiKeyListItem {
  key: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface AuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface UsageSummary {
  requestsToday: number;
  quotaDaily: number;
  remainingToday: number;
  resetPeriod: 'Daily';
  paymentPeriod: 'None';
  resetAt?: string;
  series: { date: string; count: number }[];
  byKey: { apiKeyId: string; name: string; count: number }[];
}
