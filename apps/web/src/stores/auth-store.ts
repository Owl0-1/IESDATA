'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens } from '@/types/api';

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (
    tokens: AuthTokens,
    user: AuthUser,
  ) => void;
  updateUser: (user: AuthUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (tokens, user) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user,
        }),
      updateUser: (user) => set({ user }),
      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
        }),
    }),
    { name: 'iesdata-auth' },
  ),
);
