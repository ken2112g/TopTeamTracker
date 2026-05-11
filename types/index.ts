// Types cho EtsyPulse Web

export interface Collection {
  id: string;
  name: string;
  keyword?: string;
  color: string;
  description?: string;
  createdAt: string;
  listingsCount: number;
}

export interface Listing {
  id: string;
  etsyListingId: string;
  url: string;
  title: string;
  shopName: string;
  emoji?: string;
  imageUrl?: string;
  currentPrice?: number;
  oldPrice?: number;
  rating?: number;
  reviewsCount: number;
  isActive: boolean;
  snapshotMode: 'daily' | 'hourly' | '6hours';
  collectionId?: string;
  collection?: Collection;
  firstTrackedAt: string;
  lastSnapshotAt?: string;
  tags?: Tag[];
  // Etsy listing metadata
  etsyCreatedAt?: string;
  etsyUpdatedAt?: string;
  favoritesCount?: number;
  country?: string;
  currency?: string;
  // Computed for display
  snapshots?: Snapshot[];
}

export interface Snapshot {
  id: string;
  listingId: string;
  capturedAt: string;
  source: 'etsy_scrape' | 'heyetsy' | 'estimate';
  soldTotal: number;
  soldDaily: number;
  viewsTotal: number;
  viewsDaily: number;
  revenueUsd: number;
  price: number;
  favorites?: number;
  reviewsCount?: number;
  rating?: number;
  confidence?: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface SearchResult {
  emoji: string;
  title: string;
  shop: string;
  url: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviewsCount: number;
  estimatedSold: number;
  estimatedRevenue: number;
  // HeyEtsy-style metrics
  soldDaily?: number;
  viewsDaily?: number;
  viewsTotal?: number;
  favorites?: number;
  favRate?: number;
  createdAt?: string;
  updatedAt?: string;
  // Shop location & currency
  country?: string;
  currency?: string;
  isHot?: boolean;
}

export type DateRange = '7d' | '10d' | '20d' | '30d' | '60d' | '90d';
export type Granularity = 'hourly' | 'daily' | 'weekly';

// Auth & Team types
export type AccountType = 'personal' | 'team';
export type UserRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'active' | 'suspended';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  accountType: AccountType;
  role: UserRole;
  teamId?: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  status: MemberStatus;
  joinedAt: string;
  lastActiveAt?: string;
}

export interface MockCredential {
  userId: string;
  email: string;
  password: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  user?: AuthUser;
  action: string;
  targetType: 'listing' | 'collection' | 'snapshot';
  targetId: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
