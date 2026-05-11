'use server';

export interface CookieStatus {
  hasCookie: boolean;
  source: 'daemon' | 'env' | 'none';
  cookiePreview: string | null;
  daemonRunning: boolean;
  daemonLastRefresh: string | null;
  daemonRefreshCount: number;
  lastError: string | null;
}

export async function getCookieStatus(): Promise<CookieStatus> {
  // 1. Check daemon
  try {
    const daemonUrl = process.env.SCRAPER_DAEMON_URL ?? 'http://localhost:3001';
    const res = await fetch(`${daemonUrl}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2_000),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.ready && json.hasCookie) {
        return {
          hasCookie: true,
          source: 'daemon',
          cookiePreview: json.cookiePreview,
          daemonRunning: true,
          daemonLastRefresh: json.lastRefresh,
          daemonRefreshCount: json.refreshCount ?? 0,
          lastError: null,
        };
      }
      // Daemon running but no cookie yet
      return {
        hasCookie: false,
        source: 'none',
        cookiePreview: null,
        daemonRunning: true,
        daemonLastRefresh: json.lastRefresh,
        daemonRefreshCount: json.refreshCount ?? 0,
        lastError: json.lastError,
      };
    }
  } catch {
    // Daemon not running
  }

  // 2. Check env var
  const envCookie = process.env.ETSY_DATADOME_COOKIE ?? '';
  if (envCookie.length > 20) {
    return {
      hasCookie: true,
      source: 'env',
      cookiePreview: envCookie.slice(0, 12) + '...',
      daemonRunning: false,
      daemonLastRefresh: null,
      daemonRefreshCount: 0,
      lastError: null,
    };
  }

  return {
    hasCookie: false,
    source: 'none',
    cookiePreview: null,
    daemonRunning: false,
    daemonLastRefresh: null,
    daemonRefreshCount: 0,
    lastError: null,
  };
}
