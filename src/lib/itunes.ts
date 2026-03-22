'use server';

/**
 * iTunes Search API enrichment.
 * No auth required. Free. Returns preview URLs and high-res artwork (600x600).
 */

export interface ItunesTrack {
  previewUrl: string | null;
  artworkUrl: string | null;
  trackName: string;
  artistName: string;
  collectionName: string;
}

// Simple in-process dedup cache to avoid hammering iTunes with the same query
const _cache = new Map<string, ItunesTrack | null>();

export async function searchItunes(
  trackName: string,
  artistName: string
): Promise<ItunesTrack | null> {
  const cacheKey = `${trackName.toLowerCase()}::${artistName.toLowerCase()}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)!;

  try {
    const query = encodeURIComponent(`${trackName} ${artistName}`);
    const url = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=3`;

    // Abort after 4 seconds to prevent hanging the entire card load
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);

    if (!res.ok) {
      _cache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      _cache.set(cacheKey, null);
      return null;
    }

    const best = data.results[0];

    // iTunes gives 100x100 JPEG. Upgrade to 600x600 WebP for better
    // compression and sharper rendering on high-DPI / 120Hz displays.
    const artwork = best.artworkUrl100
      ? best.artworkUrl100.replace('100x100bb', '600x600bb.webp')
      : null;

    const result: ItunesTrack = {
      previewUrl: best.previewUrl || null,
      artworkUrl: artwork,
      trackName: best.trackName,
      artistName: best.artistName,
      collectionName: best.collectionName || '',
    };

    _cache.set(cacheKey, result);
    return result;
  } catch {
    // timeout or network error — skip enrichment gracefully
    _cache.set(cacheKey, null);
    return null;
  }
}
