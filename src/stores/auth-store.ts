"use client";

import { create } from "zustand";
import { User } from "@/types/domain";
import { api } from "@/lib/api/client";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  init: () => Promise<void>;
  loginAs: (email: string) => Promise<User>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  setUser: (user: User | null) => set({ user, isLoading: false }),

  init: async () => {
    try {
      set({ isLoading: true });
      const current = await api.getCurrentUser();
      set({ user: current, isLoading: false, error: null });
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  loginAs: async (email: string) => {
    try {
      set({ isLoading: true, error: null });
      const user = await api.loginAs(email);
      set({ user, isLoading: false });
      return user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal masuk.";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await api.logout();
    set({ user: null, isLoading: false, error: null });
  },
}));

