'use client';

import { create } from 'zustand';

interface Toast {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

export interface SearchHistoryItem {
  keyword: string;
  count: number;
  date: string;
  results: number;
}

export interface UserCollection {
  id: string;
  name: string;
  color: string;
  keyword?: string;
  createdAt: string;
  listingsCount: number;
}

export interface AlertRule {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  threshold?: string;
  type: 'price' | 'sales' | 'views' | 'cvr';
}

interface Settings {
  priceDropAlert: boolean;
  salesBoomAlert: boolean;
  emailDigest: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  priceDropAlert: true,
  salesBoomAlert: true,
  emailDigest: false,
};

const DEFAULT_ALERT_RULES: AlertRule[] = [
  { id: 'a1', label: 'Đối thủ giảm giá', description: 'Khi 1 SP bạn track giảm giá ≥10%', icon: '💰', enabled: true, threshold: '10%', type: 'price' },
  { id: 'a2', label: 'Bùng nổ doanh số', description: 'Khi SP bán tăng x2 so với trung bình 7 ngày', icon: '🚀', enabled: true, threshold: '2x', type: 'sales' },
  { id: 'a3', label: 'Lượt xem tăng mạnh', description: 'Khi views tăng >50% trong 1 ngày', icon: '👁', enabled: false, threshold: '50%', type: 'views' },
  { id: 'a4', label: 'CVR giảm nghiêm trọng', description: 'Khi tỷ lệ chuyển đổi giảm xuống dưới 2%', icon: '📉', enabled: false, threshold: '2%', type: 'cvr' },
  { id: 'a5', label: 'Đối thủ tăng giá', description: 'Khi 1 SP bạn track tăng giá ≥15%', icon: '📈', enabled: false, threshold: '15%', type: 'price' },
];

const DEFAULT_HISTORY: SearchHistoryItem[] = [
  { keyword: 'birthday romper', count: 50, date: '08/05/2026', results: 50 },
  { keyword: 'personalized mug', count: 50, date: '07/05/2026', results: 50 },
  { keyword: 'unicorn gift', count: 30, date: '06/05/2026', results: 30 },
  { keyword: 'cake smash outfit', count: 50, date: '05/05/2026', results: 48 },
  { keyword: 'custom dog portrait', count: 20, date: '04/05/2026', results: 20 },
];

interface AppStore {
  // Selection (cho compare)
  selectedListingIds: string[];
  toggleSelectListing: (id: string) => void;
  setSelectedListingIds: (ids: string[]) => void;
  clearSelected: () => void;

  // Modal
  isAddModalOpen: boolean;
  setAddModalOpen: (open: boolean) => void;

  // Toasts
  toasts: Toast[];
  showToast: (title: string, message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Collection management (Phase 1 mock)
  hiddenListingIds: string[];
  hideListingFromCollection: (id: string) => void;
  deletedCollectionIds: string[];
  deleteCollection: (id: string) => void;

  // User-created collections
  userCollections: UserCollection[];
  createCollection: (name: string, color: string, keyword?: string) => string;

  // Settings
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;

  // Search history
  searchHistory: SearchHistoryItem[];
  addSearchHistory: (item: Omit<SearchHistoryItem, 'date'>) => void;
  clearSearchHistory: () => void;

  // Tags per listing
  listingTags: Record<string, string[]>;
  addListingTag: (listingId: string, tag: string) => void;
  removeListingTag: (listingId: string, tag: string) => void;

  // Alert rules
  alertRules: AlertRule[];
  toggleAlertRule: (id: string) => void;
  updateAlertThreshold: (id: string, threshold: string) => void;

  // Trigger sidebar refetch
  sidebarRefreshKey: number;
  refreshSidebar: () => void;

  // Reset
  resetAllData: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  selectedListingIds: [],
  toggleSelectListing: (id) =>
    set((state) => ({
      selectedListingIds: state.selectedListingIds.includes(id)
        ? state.selectedListingIds.filter((x) => x !== id)
        : [...state.selectedListingIds, id],
    })),
  setSelectedListingIds: (ids) => set({ selectedListingIds: ids }),
  clearSelected: () => set({ selectedListingIds: [] }),

  isAddModalOpen: false,
  setAddModalOpen: (open) => set({ isAddModalOpen: open }),

  toasts: [],
  showToast: (title, message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, title, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  hiddenListingIds: [],
  hideListingFromCollection: (id) =>
    set((state) => ({ hiddenListingIds: [...state.hiddenListingIds, id] })),

  deletedCollectionIds: [],
  deleteCollection: (id) =>
    set((state) => ({ deletedCollectionIds: [...state.deletedCollectionIds, id] })),

  userCollections: [],
  createCollection: (name, color, keyword) => {
    const id = `user-col-${Date.now()}`;
    const newCol: UserCollection = {
      id,
      name,
      color,
      keyword,
      createdAt: new Date().toISOString(),
      listingsCount: 0,
    };
    set((state) => ({ userCollections: [...state.userCollections, newCol] }));
    return id;
  },

  settings: DEFAULT_SETTINGS,
  updateSetting: (key, value) =>
    set((state) => ({ settings: { ...state.settings, [key]: value } })),

  searchHistory: DEFAULT_HISTORY,
  addSearchHistory: (item) => {
    const today = new Date();
    const date = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const newItem: SearchHistoryItem = { ...item, date };
    set((state) => ({
      searchHistory: [newItem, ...state.searchHistory.filter((h) => h.keyword !== item.keyword)].slice(0, 20),
    }));
  },
  clearSearchHistory: () => set({ searchHistory: [] }),

  listingTags: {},
  addListingTag: (listingId, tag) =>
    set((state) => {
      const current = state.listingTags[listingId] || [];
      if (current.includes(tag)) return state;
      return { listingTags: { ...state.listingTags, [listingId]: [...current, tag] } };
    }),
  removeListingTag: (listingId, tag) =>
    set((state) => ({
      listingTags: {
        ...state.listingTags,
        [listingId]: (state.listingTags[listingId] || []).filter((t) => t !== tag),
      },
    })),

  alertRules: DEFAULT_ALERT_RULES,
  toggleAlertRule: (id) =>
    set((state) => ({
      alertRules: state.alertRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    })),
  updateAlertThreshold: (id, threshold) =>
    set((state) => ({
      alertRules: state.alertRules.map((r) => (r.id === id ? { ...r, threshold } : r)),
    })),

  sidebarRefreshKey: 0,
  refreshSidebar: () => set((state) => ({ sidebarRefreshKey: state.sidebarRefreshKey + 1 })),

  resetAllData: () =>
    set({
      hiddenListingIds: [],
      deletedCollectionIds: [],
      userCollections: [],
      searchHistory: DEFAULT_HISTORY,
      listingTags: {},
      alertRules: DEFAULT_ALERT_RULES,
      settings: DEFAULT_SETTINGS,
      selectedListingIds: [],
    }),
}));
