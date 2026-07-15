import { useAuthStore } from '@/stores/auth-store';
import type { AuthSessionResponse } from '@/types/api';

const rawBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export function getApiBaseUrl(): string {
  return rawBase.replace(/\/$/, '');
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshInFlight: Promise<string | null> | null = null;

function logoutAndRedirect() {
  useAuthStore.getState().clearSession();
  if (typeof window !== 'undefined') {
    window.location.replace('/login');
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return null;

      const data = (await response.json()) as AuthSessionResponse;
      useAuthStore.getState().setSession(
        { accessToken: data.accessToken, refreshToken: data.refreshToken },
        data.user,
      );
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & {
    apiKey?: string;
    accessToken?: string;
    /** @internal */
    _retried?: boolean;
  } = {},
): Promise<T> {
  const { apiKey, accessToken: accessTokenArg, headers, _retried, ...rest } =
    init;
  // Prefer store token so callers with a stale closure still use a refreshed JWT.
  const accessToken =
    accessTokenArg != null
      ? (useAuthStore.getState().accessToken ?? accessTokenArg)
      : undefined;
  const nextHeaders = new Headers(headers);

  if (apiKey) {
    nextHeaders.set('X-API-Key', apiKey);
  }
  if (accessToken) {
    nextHeaders.set('Authorization', `Bearer ${accessToken}`);
  }
  if (!nextHeaders.has('Content-Type') && rest.body) {
    nextHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers: nextHeaders,
  });

  if (response.status === 401 && accessToken && !_retried) {
    const nextAccessToken = await refreshAccessToken();
    if (nextAccessToken) {
      return apiFetch<T>(path, {
        ...init,
        accessToken: nextAccessToken,
        _retried: true,
      });
    }
    logoutAndRedirect();
    throw new ApiError('Sessão expirada', 401);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
      code?: string;
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? response.statusText);
    throw new ApiError(message, response.status, body?.code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
