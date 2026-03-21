const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export const fetchLastFm = async (method: string, params: Record<string, string>) => {
  if (!LASTFM_API_KEY) {
    throw new Error('Last.fm API key is not set in environment variables.');
  }

  const queryParams = new URLSearchParams({
    method,
    api_key: LASTFM_API_KEY,
    format: 'json',
    ...params,
  });

  const response = await fetch(`${LASTFM_BASE_URL}?${queryParams.toString()}`, {
    next: { revalidate: 3600 }, // cached for 1 hour
  });

  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.statusText}`);
  }

  return response.json();
};

export const getTopTracksByGenre = async (tag: string, limit = 50) => {
  return fetchLastFm('tag.gettoptracks', { tag, limit: limit.toString() });
};

export const getSimilarArtists = async (artist: string, limit = 20) => {
  return fetchLastFm('artist.getsimilar', { artist, limit: limit.toString() });
};
