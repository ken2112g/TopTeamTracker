import type { Collection, Listing, Snapshot, SearchResult } from '@/types';

// Helper tạo ID
const cid = (() => {
  let counter = 0;
  return (prefix = 'id') => `${prefix}_${++counter}_${Date.now().toString(36)}`;
})();

// Generate snapshots 30 ngày cho 1 listing
function generateSnapshots(listingId: string, basePrice: number, baseSold: number, baseViews: number): Snapshot[] {
  const snapshots: Snapshot[] = [];
  let cumSold = baseSold;
  let cumViews = baseViews;
  
  for (let d = 30; d >= 0; d--) {
    const dailySold = Math.floor(15 + Math.sin(d * 0.4) * 5 + Math.random() * 10);
    const dailyViews = Math.floor(400 + Math.sin(d * 0.3) * 80 + Math.random() * 150);
    cumSold += dailySold;
    cumViews += dailyViews;
    const date = new Date();
    date.setDate(date.getDate() - d);
    
    snapshots.push({
      id: cid('snap'),
      listingId,
      capturedAt: date.toISOString(),
      source: 'estimate',
      soldTotal: cumSold,
      soldDaily: dailySold,
      viewsTotal: cumViews,
      viewsDaily: dailyViews,
      revenueUsd: dailySold * basePrice,
      price: basePrice,
      favorites: Math.floor(cumViews * 0.019 + 200 + Math.random() * 50),
      confidence: 75 + Math.random() * 20
    });
  }
  return snapshots;
}

// COLLECTIONS
export const mockCollections: Collection[] = [
  { id: 'coll_birthday', name: 'Birthday romper', keyword: 'birthday romper', color: '#f1641e', createdAt: new Date(Date.now() - 22 * 86400000).toISOString(), listingsCount: 8 },
  { id: 'coll_mug', name: 'Personalized mug', keyword: 'personalized mug', color: '#a78bfa', createdAt: new Date(Date.now() - 15 * 86400000).toISOString(), listingsCount: 5 },
  { id: 'coll_competitor', name: 'Đối thủ chính', color: '#ef4444', createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), listingsCount: 4 },
  { id: 'coll_inspiration', name: 'Cảm hứng thiết kế', color: '#84cc16', createdAt: new Date(Date.now() - 8 * 86400000).toISOString(), listingsCount: 6 },
  { id: 'coll_shirt2', name: '2nd birthday shirt', keyword: '2nd birthday shirt boy', color: '#facc15', createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), listingsCount: 12 },
  { id: 'coll_unicorn', name: 'Unicorn gift', keyword: 'unicorn gift for girl', color: '#ec4899', createdAt: new Date(Date.now() - 12 * 86400000).toISOString(), listingsCount: 9 },
  { id: 'coll_dog', name: 'Custom dog portrait', keyword: 'custom dog portrait', color: '#60a5fa', createdAt: new Date(Date.now() - 18 * 86400000).toISOString(), listingsCount: 7 },
  { id: 'coll_tshirt', name: 'Funny cat shirt', keyword: 'funny cat shirt', color: '#84cc16', createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), listingsCount: 15 },
  { id: 'coll_wedding', name: 'Wedding gift', keyword: 'personalized wedding gift', color: '#a78bfa', createdAt: new Date(Date.now() - 25 * 86400000).toISOString(), listingsCount: 11 },
  { id: 'coll_xmas', name: 'Christmas ornament', keyword: 'custom christmas ornament', color: '#ef4444', createdAt: new Date(Date.now() - 40 * 86400000).toISOString(), listingsCount: 20 },
  { id: 'coll_tote', name: 'Tote bag', keyword: 'funny tote bag', color: '#f1641e', createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), listingsCount: 6 },
  { id: 'coll_nurse', name: 'Nurse gift', keyword: 'nurse appreciation gift', color: '#60a5fa', createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), listingsCount: 8 },
];

// PRODUCTS DATA
const PRODUCTS_DATA = [
  { emoji: '👶', title: 'Rainbow Balloon Birthday Romper, 1st Birthday Outfit, Personalized Name Romper for Toddler', shop: 'LittleFruitTreeShop', price: 22.04, oldPrice: 24.49, rating: 5.0, reviews: 10200, sold: 670, views: 16400, collId: 'coll_birthday', favorites: 46875, createdAgo: 1460, updatedAgo: 2, country: 'US', currency: 'USD' },
  { emoji: '🎈', title: 'Custom Name Birthday Outfit Toddler Romper Personalized for First Birthday', shop: 'TinyTotsBoutique', price: 24.99, rating: 4.9, reviews: 5800, sold: 412, views: 9200, collId: 'coll_birthday', favorites: 21400, createdAgo: 900, updatedAgo: 5, country: 'CA', currency: 'CAD' },
  { emoji: '🦄', title: 'Unicorn First Birthday Romper Girl Cake Smash Outfit Magical', shop: 'MagicalThreads', price: 28.50, oldPrice: 35.00, rating: 4.8, reviews: 3200, sold: 298, views: 7800, collId: 'coll_birthday', favorites: 12300, createdAgo: 730, updatedAgo: 1, country: 'GB', currency: 'GBP' },
  { emoji: '🌈', title: 'Rainbow Theme 2nd Birthday Shirt Personalized Toddler Cute Design', shop: 'BabyBoutiqueCo', price: 19.99, rating: 5.0, reviews: 8400, sold: 521, views: 11200, collId: 'coll_birthday', favorites: 33700, createdAgo: 1095, updatedAgo: 3, country: 'US', currency: 'USD' },
  { emoji: '🐻', title: 'Bear Themed Birthday Romper Brown Beige Boy Outfit Woodland', shop: 'WoodlandWears', price: 26.00, oldPrice: 30.00, rating: 4.9, reviews: 1800, sold: 184, views: 5400, collId: 'coll_birthday', favorites: 8900, createdAgo: 540, updatedAgo: 7, country: 'AU', currency: 'AUD' },
  { emoji: '🎂', title: 'Cake Smash Outfit Boy 1st Birthday Bow Tie Suspenders Set', shop: 'DapperBabies', price: 32.50, rating: 4.9, reviews: 2900, sold: 267, views: 6800, collId: 'coll_birthday', favorites: 11200, createdAgo: 820, updatedAgo: 4, country: 'US', currency: 'USD' },
  { emoji: '⭐', title: 'Twinkle Star Birthday Romper Gold Stars Pattern Personalized', shop: 'StarrySkyShop', price: 21.00, oldPrice: 25.00, rating: 4.8, reviews: 4100, sold: 340, views: 8100, collId: 'coll_birthday', favorites: 18600, createdAgo: 1200, updatedAgo: 1, country: 'VN', currency: 'VND' },
  { emoji: '🦒', title: 'Safari Animals Birthday Outfit Toddler Romper Set Wild Theme', shop: 'WildOnesKids', price: 29.99, rating: 5.0, reviews: 1500, sold: 156, views: 4200, collId: 'coll_birthday', favorites: 6500, createdAgo: 365, updatedAgo: 14, country: 'US', currency: 'USD' },
  // Mug collection
  { emoji: '☕', title: 'Personalized Coffee Mug Custom Name Quote Gift', shop: 'MugMasters', price: 18.99, rating: 4.9, reviews: 6700, sold: 489, views: 12300, collId: 'coll_mug', favorites: 28400, createdAgo: 1825, updatedAgo: 6, country: 'US', currency: 'USD' },
  { emoji: '🍵', title: 'Custom Photo Mug Gift for Mom Dad Anniversary', shop: 'PhotoGiftCo', price: 22.50, oldPrice: 28.00, rating: 5.0, reviews: 9100, sold: 612, views: 15800, collId: 'coll_mug', favorites: 39200, createdAgo: 2190, updatedAgo: 2, country: 'CA', currency: 'CAD' },
  { emoji: '☕', title: 'Funny Cat Mug Personalized Name for Cat Lovers', shop: 'CatLoversShop', price: 17.99, rating: 4.8, reviews: 3400, sold: 287, views: 7100, collId: 'coll_mug', favorites: 14700, createdAgo: 670, updatedAgo: 9, country: 'VN', currency: 'VND' },
  // Competitors
  { emoji: '👶', title: 'Premium Birthday Outfit Set Toddler Custom Made USA', shop: 'BigCompetitor1', price: 35.00, rating: 4.9, reviews: 12000, sold: 890, views: 22000, collId: 'coll_competitor', favorites: 58100, createdAgo: 2555, updatedAgo: 1, country: 'US', currency: 'USD' },
  { emoji: '🎂', title: 'Luxury First Birthday Set Multi-Color Theme Toddler', shop: 'BigCompetitor2', price: 42.00, oldPrice: 48.00, rating: 5.0, reviews: 8800, sold: 654, views: 18500, collId: 'coll_competitor', favorites: 44300, createdAgo: 1950, updatedAgo: 3, country: 'VN', currency: 'VND' }
];

// LISTINGS với snapshots
export const mockListings: Listing[] = PRODUCTS_DATA.map((p, i) => {
  const id = `listing_${i + 1}`;
  const createdAt = new Date(Date.now() - (p.createdAgo ?? 730) * 86400000).toISOString();
  const updatedAt = new Date(Date.now() - (p.updatedAgo ?? 3) * 86400000).toISOString();
  return {
    id,
    etsyListingId: `${1000000 + i}`,
    url: `https://www.etsy.com/listing/${1000000 + i}`,
    title: p.title,
    shopName: p.shop,
    emoji: p.emoji,
    currentPrice: p.price,
    oldPrice: p.oldPrice,
    rating: p.rating,
    reviewsCount: p.reviews,
    isActive: true,
    snapshotMode: 'daily',
    collectionId: p.collId,
    firstTrackedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastSnapshotAt: new Date().toISOString(),
    etsyCreatedAt: createdAt,
    etsyUpdatedAt: updatedAt,
    favoritesCount: p.favorites,
    country: p.country ?? 'US',
    currency: p.currency ?? 'USD',
    snapshots: generateSnapshots(id, p.price, p.sold - 670, p.views - 16400)
  };
});

// Map cho dễ lookup
export const mockListingsById = new Map(mockListings.map((l) => [l.id, l]));
export const mockCollectionsById = new Map(mockCollections.map((c) => [c.id, c]));

// SEARCH MOCK
const COUNTRY_POOL = [
  { country: 'US', currency: 'USD' },
  { country: 'US', currency: 'USD' },
  { country: 'US', currency: 'USD' },
  { country: 'VN', currency: 'VND' },
  { country: 'CA', currency: 'CAD' },
  { country: 'GB', currency: 'GBP' },
  { country: 'AU', currency: 'AUD' },
  { country: 'VN', currency: 'VND' },
];

export function mockSearch(keyword: string, limit: number): SearchResult[] {
  const TEMPLATES = [
    { emoji: '👶', title: 'Rainbow Balloon Birthday Romper' },
    { emoji: '🎈', title: 'Custom Name Birthday Outfit' },
    { emoji: '🦄', title: 'Unicorn First Birthday Romper' },
    { emoji: '🌈', title: 'Rainbow Theme 2nd Birthday Shirt' },
    { emoji: '🐻', title: 'Bear Themed Birthday Romper' },
    { emoji: '🎂', title: 'Cake Smash Outfit Boy' },
    { emoji: '⭐', title: 'Twinkle Star Birthday Romper' },
    { emoji: '🦒', title: 'Safari Animals Birthday Outfit' },
    { emoji: '🚀', title: 'Space Theme Birthday Romper' },
    { emoji: '🦖', title: 'Dinosaur Birthday Outfit Toddler' }
  ];
  const SHOPS = ['LittleFruitTreeShop', 'TinyTotsBoutique', 'MagicalThreads', 'BabyBoutiqueCo', 'WoodlandWears', 'DapperBabies', 'StarrySkyShop', 'WildOnesKids', 'CutiePatootie', 'BabyDreamShop'];
  
  const count = Math.min(limit, 50);
  return Array.from({ length: count }, (_, i) => {
    const tpl = TEMPLATES[i % TEMPLATES.length];
    const price = +(15 + Math.random() * 30).toFixed(2);
    const reviewsCount = Math.floor(Math.random() * 15000 + 100);
    const estimatedSold = Math.floor(reviewsCount * (3 + Math.random() * 2));
    const viewsTotal = Math.floor(estimatedSold * 15 + Math.random() * 5000);
    const favorites = Math.floor(reviewsCount * (0.7 + Math.random() * 0.6));
    const favRate = +((favorites / viewsTotal) * 100).toFixed(2);
    const soldDaily = Math.floor(1 + Math.random() * 12);
    const viewsDaily = Math.floor(20 + Math.random() * 120);
    const createdDaysAgo = Math.floor(365 + Math.random() * 1825);
    const updatedDaysAgo = Math.floor(1 + Math.random() * 21);
    const createdAt = new Date(Date.now() - createdDaysAgo * 86400000).toISOString();
    const updatedAt = new Date(Date.now() - updatedDaysAgo * 86400000).toISOString();

    const loc = COUNTRY_POOL[i % COUNTRY_POOL.length];
    const isHot = soldDaily > 8 || estimatedSold > 10000;

    return {
      emoji: tpl.emoji,
      title: `${tpl.title} ${keyword} Personalized #${i + 1}`,
      shop: SHOPS[i % SHOPS.length],
      url: `https://www.etsy.com/listing/${2000000 + i}`,
      price,
      oldPrice: Math.random() > 0.6 ? +(price * 1.15).toFixed(2) : undefined,
      rating: +(4.5 + Math.random() * 0.5).toFixed(1),
      reviewsCount,
      estimatedSold,
      estimatedRevenue: Math.floor(estimatedSold * price),
      soldDaily,
      viewsDaily,
      viewsTotal,
      favorites,
      favRate,
      createdAt,
      updatedAt,
      country: loc.country,
      currency: loc.currency,
      isHot,
    };
  });
}

// API mock
export const mockApi = {
  collections: {
    getAll: async () => mockCollections,
    getById: async (id: string) => mockCollectionsById.get(id) || null
  },
  listings: {
    getAll: async (collectionId?: string) => {
      if (collectionId) return mockListings.filter((l) => l.collectionId === collectionId);
      return mockListings;
    },
    getById: async (id: string) => mockListingsById.get(id) || null
  },
  snapshots: {
    getByListing: async (listingId: string, range: string) => {
      const listing = mockListingsById.get(listingId);
      if (!listing) return [];
      const days = parseInt(range) || 30;
      return (listing.snapshots || []).slice(-days);
    }
  },
  search: {
    etsy: async (keyword: string, limit: number) => {
      // Fake delay
      await new Promise((r) => setTimeout(r, 800));
      return mockSearch(keyword, limit);
    }
  }
};
