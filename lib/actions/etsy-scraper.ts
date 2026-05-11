'use server';

import * as cheerio from 'cheerio';

export interface ScrapedListing {
  etsyListingId: string;
  url: string;
  title: string;
  shopName: string;
  currentPrice: number | null;
  oldPrice: number | null;
  rating: number | null;
  reviewsCount: number;
  imageUrl: string | null;
  favoritesCount: number | null;
  currency: string;
  country: string;
  etsyCreatedAt: string | null;
  etsyUpdatedAt: string | null;
}

export interface SearchItem {
  etsyListingId: string;
  url: string;
  title: string;
  shopName: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviewsCount: number;
  imageUrl?: string;
  currency: string;
  country: string;
  estimatedSold: number;
  estimatedRevenue: number;
  soldDaily: number;
  viewsDaily: number;
  viewsTotal: number;
  favorites: number;
  favRate: number;
  isHot: boolean;
  emoji: string;
}

const EMOJIS = ['🎁', '✨', '🌟', '🎨', '🛍️', '💎', '🌈', '🎀', '🏆', '🌺'];
// Local dev: http://localhost:3001  |  Production VPS: SCRAPER_DAEMON_URL env var
const DAEMON_URL = process.env.SCRAPER_DAEMON_URL ?? 'http://localhost:3001';

// ── Cookie sources ──────────────────────────────────────────────────────────
// 1. Daemon (auto-refreshed, most reliable)
// 2. ETSY_DATADOME_COOKIE env var (manual fallback)
async function getActiveCookie(): Promise<string | null> {
  try {
    const res = await fetch(`${DAEMON_URL}/cookie`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2_000),
    });
    if (res.ok) {
      const json = await res.json();
      if (typeof json.cookie === 'string' && json.cookie.length > 20) return json.cookie;
    }
  } catch {
    // Daemon not running
  }
  const envCookie = process.env.ETSY_DATADOME_COOKIE ?? '';
  return envCookie.length > 20 ? envCookie : null;
}

function getEtsyApiKey(): string | null {
  const key = process.env.ETSY_API_KEY ?? '';
  return key.length > 10 && !key.includes('your_') ? key : null;
}

function getBrowserHeaders(cookie: string, referer = 'https://www.etsy.com/'): Record<string, string> {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Referer': referer,
    'Cookie': `datadome=${cookie}`,
  };
}

function parsePrice(str: string): number {
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}

// ── Etsy Official API v3 ────────────────────────────────────────────────────
async function searchViaApi(keyword: string, limit: number): Promise<SearchItem[] | { error: string }> {
  const apiKey = getEtsyApiKey();
  if (!apiKey) return { error: 'no_api_key' };

  const params = new URLSearchParams({ keywords: keyword, limit: String(Math.min(limit, 100)), sort_on: 'score', sort_order: 'desc' });
  params.append('includes[]', 'Images');
  params.append('includes[]', 'Shop');

  const res = await fetch(`https://openapi.etsy.com/v3/application/listings/active?${params}`, {
    headers: { 'x-api-key': apiKey },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    if (res.status === 403) return { error: 'api_key_pending' };
    return { error: `api_error_${res.status}` };
  }

  const json = await res.json();
  return (json.results ?? []).map((item: any, idx: number) => {
    const price = item.price ? (item.price.amount ?? 0) / (item.price.divisor ?? 100) : 0;
    const favorites = item.num_favorers ?? 0;
    const views = item.views ?? Math.floor(favorites * 18);
    const estimatedSold = Math.floor(favorites * 3.5);
    const soldDaily = Math.max(1, Math.floor(estimatedSold / 90));
    const viewsDaily = Math.max(5, Math.floor(views / 90));
    return {
      etsyListingId: String(item.listing_id),
      url: item.url ?? `https://www.etsy.com/listing/${item.listing_id}`,
      title: item.title ?? '',
      shopName: item.shop?.shop_name ?? 'Unknown',
      price: Math.round(price * 100) / 100,
      rating: item.rating ?? 4.5,
      reviewsCount: item.num_reviews ?? 0,
      imageUrl: item.images?.[0]?.url_570xN ?? undefined,
      currency: item.price?.currency_code ?? 'USD',
      country: item.shop?.country_iso ?? 'US',
      estimatedSold,
      estimatedRevenue: Math.floor(estimatedSold * price),
      soldDaily,
      viewsDaily,
      viewsTotal: views,
      favorites,
      favRate: views > 0 ? +((favorites / views) * 100).toFixed(2) : 0,
      isHot: soldDaily > 8 || estimatedSold > 10000,
      emoji: EMOJIS[idx % EMOJIS.length],
    } as SearchItem;
  });
}

// ── Daemon search (daemon làm tất cả, Next.js chỉ gọi API) ─────────────────
async function searchViaDaemon(keyword: string, limit: number): Promise<SearchItem[] | { error: string }> {
  try {
    const res = await fetch(
      `${DAEMON_URL}/search?q=${encodeURIComponent(keyword)}&limit=${limit}`,
      { cache: 'no-store', signal: AbortSignal.timeout(60_000) },
    );
    if (!res.ok) return { error: `daemon_${res.status}` };
    const json = await res.json();
    if ('error' in json) return json;
    return json.results as SearchItem[];
  } catch {
    return { error: 'daemon_unreachable' };
  }
}

// ── Cookie-based fetch (dùng khi daemon có cookie nhưng search endpoint không dùng) ─
function parseReviewCount(text: string): number {
  const t = text.trim().toLowerCase().replace(/,/g, '');
  if (t.includes('k')) return Math.floor(parseFloat(t) * 1000);
  return parseInt(t.replace(/[^0-9]/g, '')) || 0;
}

function parsePage(html: string, seen: Set<string>, limit: number, startIdx: number): SearchItem[] {
  const $ = cheerio.load(html);
  const pageDataCurrency = $('body').attr('data-currency') ||
    html.match(/data-currency="([^"]+)"/)?.[1] || 'USD';
  const isVND = pageDataCurrency === 'VND';
  const VND_RATE = 25400;
  const results: SearchItem[] = [];

  $('[data-listing-id]').each((_, el) => {
    if (results.length + startIdx >= limit) return false;
    const listingId = $(el).attr('data-listing-id') || '';
    if (!listingId || seen.has(listingId)) return;
    seen.add(listingId);

    const title =
      $(el).find('h3').first().text().trim() ||
      $(el).find('a[title]').first().attr('title') || '';
    const rawPrice = parsePrice($(el).find('.currency-value').first().text());
    const priceUSD = isVND ? Math.round((rawPrice / VND_RATE) * 100) / 100 : rawPrice;

    let shopName = 'Unknown Shop';
    const popoverText =
      $(el).find('button[class*="wt-popover__trigger"]').first().text().trim() ||
      $(el).find('[class*="wt-popover"]').first().text().trim();
    const byMatch = popoverText.match(/(?:Ad・)?By\s+([^\n\r]+)/);
    if (byMatch) shopName = byMatch[1].trim();

    const imageUrl = $(el).find('img').first().attr('src') || undefined;
    const cardText = $(el).text();
    const reviewMatch = cardText.match(/\(([0-9.,]+[kK]?)\)/);
    const reviewsCount = reviewMatch ? parseReviewCount(reviewMatch[1]) : 0;
    const ratingMatch = cardText.match(/(\d+\.\d+)\s*\(/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 4.5;

    const favorites = Math.floor(reviewsCount * 0.8);
    const estimatedSold = Math.floor(reviewsCount * 3.5);
    const viewsTotal = Math.floor(estimatedSold * 15);
    const soldDaily = Math.max(1, Math.floor(estimatedSold / 90));
    const viewsDaily = Math.max(5, Math.floor(viewsTotal / 90));
    const favRate = viewsTotal > 0 ? +((favorites / viewsTotal) * 100).toFixed(2) : 0;
    const idx = startIdx + results.length;

    results.push({
      etsyListingId: listingId,
      url: `https://www.etsy.com/listing/${listingId}`,
      title: title || `Listing #${listingId}`,
      shopName,
      price: priceUSD,
      rating,
      reviewsCount,
      imageUrl,
      currency: 'USD',
      country: 'US',
      estimatedSold,
      estimatedRevenue: Math.floor(estimatedSold * priceUSD),
      soldDaily,
      viewsDaily,
      viewsTotal,
      favorites,
      favRate,
      isHot: soldDaily > 8 || estimatedSold > 10000,
      emoji: EMOJIS[idx % EMOJIS.length],
    });
  });
  return results;
}

async function searchViaCookie(keyword: string, limit: number, cookie: string): Promise<SearchItem[] | { error: string }> {
  const results: SearchItem[] = [];
  const seen = new Set<string>();
  const pagesNeeded = Math.ceil(limit / 11);

  for (let page = 1; page <= Math.min(pagesNeeded, 8); page++) {
    const url = `https://www.etsy.com/search?q=${encodeURIComponent(keyword)}&explicit=1&page=${page}`;
    const referer = page === 1
      ? 'https://www.etsy.com/'
      : `https://www.etsy.com/search?q=${encodeURIComponent(keyword)}&page=${page - 1}`;

    const res = await fetch(url, { headers: getBrowserHeaders(cookie, referer), next: { revalidate: 0 } });

    if (!res.ok) {
      if (page === 1) return { error: 'cookie_expired' };
      break;
    }

    const html = await res.text();
    if (html.includes('captcha-delivery') || html.includes('temporarily restricted')) {
      if (page === 1) return { error: 'cookie_expired' };
      break;
    }

    const pageItems = parsePage(html, seen, limit, results.length);
    results.push(...pageItems);
    if (results.length >= limit) break;

    if (page < pagesNeeded) await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
  }

  if (results.length === 0) return { error: 'no_results' };
  return results;
}

// ── Public: searchEtsy ──────────────────────────────────────────────────────
// Priority: Etsy API → Daemon search → Direct cookie fetch → error
export async function searchEtsy(keyword: string, limit = 20): Promise<SearchItem[] | { error: string }> {
  // 1. Official API (nếu key active)
  const apiResult = await searchViaApi(keyword, limit);
  if (!('error' in apiResult)) return apiResult;
  const apiErr = (apiResult as { error: string }).error;
  if (apiErr !== 'no_api_key' && apiErr !== 'api_key_pending') return apiResult;

  // 2. Daemon search (daemon xử lý cả cookie + fetch)
  const daemonResult = await searchViaDaemon(keyword, limit);
  if (!('error' in daemonResult)) return daemonResult;
  const daemonErr = (daemonResult as { error: string }).error;
  if (daemonErr !== 'daemon_unreachable') {
    // Daemon đang chạy nhưng cookie của nó bị expired → vẫn thử direct cookie
  }

  // 3. Direct cookie fetch (dùng cookie từ daemon hoặc env)
  const cookie = await getActiveCookie();
  if (cookie) return searchViaCookie(keyword, limit, cookie);

  return { error: 'no_cookie' };
}

// ── Single listing scrape ───────────────────────────────────────────────────
export async function scrapeEtsyListing(url: string): Promise<ScrapedListing | { error: string }> {
  const match = url.match(/\/listing\/(\d+)/);
  if (!match) return { error: 'URL Etsy không hợp lệ' };
  const listingId = match[1];

  // Thử API trước
  const apiKey = getEtsyApiKey();
  if (apiKey) {
    try {
      const params = new URLSearchParams();
      params.append('includes[]', 'Images');
      params.append('includes[]', 'Shop');
      const res = await fetch(`https://openapi.etsy.com/v3/application/listings/${listingId}?${params}`, {
        headers: { 'x-api-key': apiKey }, next: { revalidate: 0 },
      });
      if (res.ok) {
        const item = await res.json();
        const price = item.price ? (item.price.amount ?? 0) / (item.price.divisor ?? 100) : null;
        return {
          etsyListingId: listingId, url,
          title: item.title ?? '', shopName: item.shop?.shop_name ?? 'Unknown',
          currentPrice: price, oldPrice: null,
          rating: item.rating ?? null, reviewsCount: item.num_reviews ?? 0,
          imageUrl: item.images?.[0]?.url_570xN ?? null,
          favoritesCount: item.num_favorers ?? null,
          currency: item.price?.currency_code ?? 'USD', country: item.shop?.country_iso ?? 'US',
          etsyCreatedAt: item.creation_timestamp ? new Date(item.creation_timestamp * 1000).toISOString() : null,
          etsyUpdatedAt: item.last_modified_timestamp ? new Date(item.last_modified_timestamp * 1000).toISOString() : null,
        };
      }
    } catch {}
  }

  // Fallback: fetch với cookie
  const cookie = await getActiveCookie();
  if (!cookie) return { error: 'no_cookie' };

  const res = await fetch(url, { headers: getBrowserHeaders(cookie), next: { revalidate: 0 } });
  if (!res.ok) return { error: `Etsy ${res.status}` };

  const html = await res.text();
  const $ = cheerio.load(html);

  let title = '', shopName = 'Unknown', price: number | null = null;
  let rating: number | null = null, reviewsCount = 0, imageUrl: string | null = null;
  let currency = 'USD', favorites: number | null = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '{}');
      if (json['@type'] === 'Product') {
        title = json.name || title;
        shopName = json.brand?.name || shopName;
        if (json.offers?.price) price = parseFloat(json.offers.price);
        if (json.offers?.priceCurrency) currency = json.offers.priceCurrency;
        if (json.aggregateRating) {
          rating = parseFloat(json.aggregateRating.ratingValue) || null;
          reviewsCount = parseInt(json.aggregateRating.reviewCount) || 0;
        }
        if (json.image?.[0]) imageUrl = json.image[0];
      }
    } catch {}
  });

  if (!title) title = $('h1').first().text().trim();

  return { etsyListingId: listingId, url, title, shopName, currentPrice: price, oldPrice: null, rating, reviewsCount, imageUrl, favoritesCount: favorites, currency, country: 'US', etsyCreatedAt: null, etsyUpdatedAt: null };
}
