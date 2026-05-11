'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser, Team, TeamMember, MockCredential } from '@/types';

// ─── Seed data (always merged back if localStorage is cleared) ─────────────

const SEED_CREDENTIALS: MockCredential[] = [
  { userId: 'u-owner-1', email: 'owner@demo.com', password: 'demo123' },
  { userId: 'u-admin-1', email: 'admin@demo.com', password: 'demo123' },
  { userId: 'u-member-1', email: 'member1@demo.com', password: 'demo123' },
  { userId: 'u-personal-1', email: 'personal@demo.com', password: 'demo123' },
];

const SEED_USERS: AuthUser[] = [
  { id: 'u-owner-1', email: 'owner@demo.com', name: 'Nguyễn Văn An', accountType: 'team', role: 'owner', teamId: 'team-seed-1', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'u-admin-1', email: 'admin@demo.com', name: 'Trần Thị Bình', accountType: 'team', role: 'admin', teamId: 'team-seed-1', createdAt: '2026-01-05T00:00:00Z' },
  { id: 'u-member-1', email: 'member1@demo.com', name: 'Lê Văn Cường', accountType: 'team', role: 'member', teamId: 'team-seed-1', createdAt: '2026-01-10T00:00:00Z' },
  { id: 'u-personal-1', email: 'personal@demo.com', name: 'Phạm Thị Dung', accountType: 'personal', role: 'owner', createdAt: '2026-01-15T00:00:00Z' },
];

const SEED_TEAM: Team = {
  id: 'team-seed-1',
  name: 'POD Team Vietnam',
  ownerId: 'u-owner-1',
  createdAt: '2026-01-01T00:00:00Z',
};

const SEED_TEAM_MEMBERS: TeamMember[] = [
  { id: 'tm-1', teamId: 'team-seed-1', userId: 'u-owner-1', email: 'owner@demo.com', name: 'Nguyễn Văn An', role: 'member', status: 'active', joinedAt: '2026-01-01T00:00:00Z', lastActiveAt: '2026-05-09T08:00:00Z' },
  { id: 'tm-2', teamId: 'team-seed-1', userId: 'u-admin-1', email: 'admin@demo.com', name: 'Trần Thị Bình', role: 'admin', status: 'active', joinedAt: '2026-01-05T00:00:00Z', lastActiveAt: '2026-05-08T14:30:00Z' },
  { id: 'tm-3', teamId: 'team-seed-1', userId: 'u-member-1', email: 'member1@demo.com', name: 'Lê Văn Cường', role: 'member', status: 'active', joinedAt: '2026-01-10T00:00:00Z', lastActiveAt: '2026-05-07T10:00:00Z' },
];

// ─── Store interface ────────────────────────────────────────────────────────

interface AuthStore {
  // Session
  currentUser: AuthUser | null;
  isLoaded: boolean;
  currentTeam: Team | null;
  currentTeamMembers: TeamMember[];

  // Persisted data store
  users: AuthUser[];
  credentials: MockCredential[];
  teams: Team[];
  allTeamMembers: TeamMember[];

  // Auth actions
  login: (email: string, password: string) => AuthUser | null;
  logout: () => void;
  registerPersonal: (data: { name: string; email: string; password: string }) => { user?: AuthUser; error?: string };
  registerTeam: (data: { ownerName: string; email: string; password: string; teamName: string }) => { user?: AuthUser; error?: string };

  // Team management (owner/admin only)
  createMember: (data: { name: string; email: string; password: string; role: 'admin' | 'member' }) => { member?: TeamMember; error?: string };
  updateMemberRole: (memberId: string, role: 'admin' | 'member') => void;
  suspendMember: (memberId: string) => void;
  reactivateMember: (memberId: string) => void;
  removeMember: (memberId: string) => void;
  getMemberPassword: (userId: string) => string | null;
  changePassword: (userId: string, newPassword: string) => { error?: string };

  setLoaded: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isLoaded: false,
      currentTeam: null,
      currentTeamMembers: [],
      users: SEED_USERS,
      credentials: SEED_CREDENTIALS,
      teams: [SEED_TEAM],
      allTeamMembers: SEED_TEAM_MEMBERS,

      setLoaded: () => set({ isLoaded: true }),

      login: (email, password) => {
        const { credentials, users, teams, allTeamMembers } = get();

        const cred = credentials.find(
          (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password
        );
        if (!cred) return null;

        const user = users.find((u) => u.id === cred.userId);
        if (!user) return null;

        let currentTeam: Team | null = null;
        let currentTeamMembers: TeamMember[] = [];

        if (user.accountType === 'team' && user.teamId) {
          currentTeam = teams.find((t) => t.id === user.teamId) ?? null;
          currentTeamMembers = allTeamMembers.filter((m) => m.teamId === user.teamId);
        }

        set({ currentUser: user, currentTeam, currentTeamMembers });
        return user;
      },

      logout: () => set({ currentUser: null, currentTeam: null, currentTeamMembers: [] }),

      registerPersonal: ({ name, email, password }) => {
        const { credentials } = get();
        if (credentials.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
          return { error: 'Email đã tồn tại' };
        }

        const userId = `u-personal-${Date.now()}`;
        const newUser: AuthUser = {
          id: userId,
          email,
          name,
          accountType: 'personal',
          role: 'owner',
          createdAt: new Date().toISOString(),
        };
        const newCred: MockCredential = { userId, email, password };

        set((state) => ({
          users: [...state.users, newUser],
          credentials: [...state.credentials, newCred],
          currentUser: newUser,
          currentTeam: null,
          currentTeamMembers: [],
        }));

        return { user: newUser };
      },

      registerTeam: ({ ownerName, email, password, teamName }) => {
        const { credentials } = get();
        if (credentials.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
          return { error: 'Email đã tồn tại' };
        }

        const userId = `u-owner-${Date.now()}`;
        const teamId = `team-${Date.now()}`;

        const newTeam: Team = {
          id: teamId,
          name: teamName,
          ownerId: userId,
          createdAt: new Date().toISOString(),
        };

        const newUser: AuthUser = {
          id: userId,
          email,
          name: ownerName,
          accountType: 'team',
          role: 'owner',
          teamId,
          createdAt: new Date().toISOString(),
        };

        const ownerMember: TeamMember = {
          id: `tm-${Date.now()}`,
          teamId,
          userId,
          email,
          name: ownerName,
          role: 'member',
          status: 'active',
          joinedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        };

        const newCred: MockCredential = { userId, email, password };

        set((state) => ({
          users: [...state.users, newUser],
          credentials: [...state.credentials, newCred],
          teams: [...state.teams, newTeam],
          allTeamMembers: [...state.allTeamMembers, ownerMember],
          currentUser: newUser,
          currentTeam: newTeam,
          currentTeamMembers: [ownerMember],
        }));

        return { user: newUser };
      },

      createMember: ({ name, email, password, role }) => {
        const { currentUser, currentTeam, credentials } = get();
        if (!currentTeam || !currentUser) return { error: 'Bạn chưa thuộc team nào' };
        if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
          return { error: 'Không có quyền tạo thành viên' };
        }
        if (credentials.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
          return { error: 'Email đã tồn tại trong hệ thống' };
        }

        const userId = `u-member-${Date.now()}`;
        const newUser: AuthUser = {
          id: userId,
          email,
          name,
          accountType: 'team',
          role,
          teamId: currentTeam.id,
          createdAt: new Date().toISOString(),
        };

        const newMember: TeamMember = {
          id: `tm-${Date.now()}`,
          teamId: currentTeam.id,
          userId,
          email,
          name,
          role,
          status: 'active',
          joinedAt: new Date().toISOString(),
        };

        const newCred: MockCredential = { userId, email, password };

        set((state) => ({
          users: [...state.users, newUser],
          credentials: [...state.credentials, newCred],
          allTeamMembers: [...state.allTeamMembers, newMember],
          currentTeamMembers: [...state.currentTeamMembers, newMember],
        }));

        return { member: newMember };
      },

      updateMemberRole: (memberId, role) => {
        set((state) => ({
          allTeamMembers: state.allTeamMembers.map((m) => m.id === memberId ? { ...m, role } : m),
          currentTeamMembers: state.currentTeamMembers.map((m) => m.id === memberId ? { ...m, role } : m),
        }));
      },

      suspendMember: (memberId) => {
        set((state) => ({
          allTeamMembers: state.allTeamMembers.map((m) => m.id === memberId ? { ...m, status: 'suspended' } : m),
          currentTeamMembers: state.currentTeamMembers.map((m) => m.id === memberId ? { ...m, status: 'suspended' } : m),
        }));
      },

      reactivateMember: (memberId) => {
        set((state) => ({
          allTeamMembers: state.allTeamMembers.map((m) => m.id === memberId ? { ...m, status: 'active' } : m),
          currentTeamMembers: state.currentTeamMembers.map((m) => m.id === memberId ? { ...m, status: 'active' } : m),
        }));
      },

      removeMember: (memberId) => {
        const member = get().allTeamMembers.find((m) => m.id === memberId);
        if (!member) return;

        set((state) => ({
          allTeamMembers: state.allTeamMembers.filter((m) => m.id !== memberId),
          currentTeamMembers: state.currentTeamMembers.filter((m) => m.id !== memberId),
          credentials: state.credentials.filter((c) => c.userId !== member.userId),
          users: state.users.filter((u) => u.id !== member.userId),
        }));
      },

      getMemberPassword: (userId) => {
        const cred = get().credentials.find((c) => c.userId === userId);
        return cred?.password ?? null;
      },

      changePassword: (userId, newPassword) => {
        if (newPassword.length < 6) return { error: 'Mật khẩu tối thiểu 6 ký tự' };
        const exists = get().credentials.some((c) => c.userId === userId);
        if (!exists) return { error: 'Không tìm thấy tài khoản' };
        set((state) => ({
          credentials: state.credentials.map((c) =>
            c.userId === userId ? { ...c, password: newPassword } : c
          ),
        }));
        return {};
      },
    }),
    {
      name: 'etsypulse-auth',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
      }),
      partialize: (state) => ({
        currentUser: state.currentUser,
        currentTeam: state.currentTeam,
        currentTeamMembers: state.currentTeamMembers,
        users: state.users,
        credentials: state.credentials,
        teams: state.teams,
        allTeamMembers: state.allTeamMembers,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Merge seed data back in case it was cleared
        const existingUserIds = state.users.map((u) => u.id);
        const missingUsers = SEED_USERS.filter((u) => !existingUserIds.includes(u.id));
        if (missingUsers.length) state.users = [...missingUsers, ...state.users];

        const existingCredIds = state.credentials.map((c) => c.userId);
        const missingCreds = SEED_CREDENTIALS.filter((c) => !existingCredIds.includes(c.userId));
        if (missingCreds.length) state.credentials = [...missingCreds, ...state.credentials];

        const existingTeamIds = state.teams.map((t) => t.id);
        if (!existingTeamIds.includes(SEED_TEAM.id)) state.teams = [SEED_TEAM, ...state.teams];

        const existingMemberIds = state.allTeamMembers.map((m) => m.id);
        const missingMembers = SEED_TEAM_MEMBERS.filter((m) => !existingMemberIds.includes(m.id));
        if (missingMembers.length) state.allTeamMembers = [...missingMembers, ...state.allTeamMembers];

        state.isLoaded = true;
      },
    }
  )
);
