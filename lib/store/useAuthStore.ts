'use client';

import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member';
  workspaceId: string;
  workspaceName: string;
  isSuperAdmin: boolean;
  // backward-compat
  accountType: 'team' | 'personal';
  teamId?: string;
}

interface AuthStore {
  currentUser: AuthUser | null;
  isLoaded: boolean;
  setCurrentUser: (user: AuthUser | null) => void;
  setLoaded: () => void;
  logout: () => void;
  currentTeam: { id: string; name: string } | null;
  currentTeamMembers: any[];
}

export const useAuthStore = create<AuthStore>((set) => ({
  currentUser: null,
  isLoaded: false,
  currentTeam: null,
  currentTeamMembers: [],

  setCurrentUser: (user) =>
    set({
      currentUser: user,
      currentTeam: user ? { id: user.workspaceId, name: user.workspaceName } : null,
    }),

  setLoaded: () => set({ isLoaded: true }),

  logout: () =>
    set({ currentUser: null, currentTeam: null, currentTeamMembers: [], isLoaded: true }),
}));
