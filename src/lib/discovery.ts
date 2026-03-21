'use server';

import { searchItunes } from './itunes';
import { getSimilarArtists, getTopTracksByGenre, fetchLastFm } from './lastfm';

const EXPLORATION_GENRES = [
  'pop', 'hiphop', 'rock', 'indie', 'electronic', 'jazz', 'classical',
  'rnb', 'metal', 'folk', 'ambient', 'synthpop', 'kpop', 'latin'
];

export interface TrackData {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  albumArt: string;
  previewUrl: string | null;
  genre?: string;
}

/**
 * Core enrichment: uses iTunes Search API (no auth, no rate limits!)
 * to get a 30-second preview URL and high-resolution (600x600) album artwork.
 */
async function enrichTrack(track: TrackData): Promise<TrackData> {
  try {
    const result = await searchItunes(track.title, track.artist);
    if (result) {
      return {
        ...track,
        albumArt: result.artworkUrl || track.albumArt,
        previewUrl: result.previewUrl ?? track.previewUrl,
      };
    }
  } catch {}
  return track;
}

/**
 * Swipe Left — Pure Exploration
 * Fetch a random trending track from a completely random genre.
 */
export const getExplorationTrack = async (forcedGenre?: string): Promise<TrackData | null> => {
  const randomGenre = forcedGenre || EXPLORATION_GENRES[Math.floor(Math.random() * EXPLORATION_GENRES.length)];

  try {
    const data = await getTopTracksByGenre(randomGenre, 30);
    const tracks = data?.tracks?.track;
    if (!tracks || tracks.length === 0) return null;

    // Pick a random track from results (skip first few overplayed ones)
    const offset = Math.floor(Math.random() * Math.min(tracks.length, 25));
    const track = tracks[offset];

    const mapped: TrackData = {
      id: `${track.name}-${track.artist?.name || ''}-${Math.random().toString(36).substring(7)}`,
      title: track.name,
      artist: track.artist?.name || 'Unknown',
      artistId: track.artist?.name || '',
      albumArt: '',
      previewUrl: null,
      genre: randomGenre,
    };

    return await enrichTrack(mapped);
  } catch {
    return null;
  }
};

/**
 * Swipe Right — Deep Dive (Top tracks of current artist)
 */
export const getArtistTopTracks = async (artistName: string): Promise<TrackData[]> => {
  try {
    const data = await fetchLastFm('artist.gettoptracks', { artist: artistName, limit: '10' });
    const tracks = data?.toptracks?.track;
    if (!tracks) return [];

    const baseTracks: TrackData[] = tracks.slice(0, 5).map((track: any) => ({
      id: `${track.name}-${artistName}-${Math.random().toString(36).substring(7)}`,
      title: track.name,
      artist: artistName,
      artistId: artistName,
      albumArt: '',
      previewUrl: null,
    }));

    return await Promise.all(baseTracks.map(enrichTrack));
  } catch {
    return [];
  }
};

/**
 * Swipe Up — Smart Discovery (80% similar, 20% explore)
 */
export const getSmartDiscoveryTrack = async (
  currentArtistName: string,
  currentTrackId: string
): Promise<TrackData | null> => {
  const isExploitation = Math.random() < 0.8;

  try {
    if (isExploitation) {
      const data = await getSimilarArtists(currentArtistName, 10);
      const artists = data?.similarartists?.artist;
      if (artists && artists.length > 0) {
        const nextArtist = artists[Math.floor(Math.random() * Math.min(artists.length, 5))].name;
        const tracks = await getArtistTopTracks(nextArtist);
        if (tracks.length > 0) return tracks[0];
      }
    }
  } catch {}

  // Fallback to pure exploration
  return getExplorationTrack();
};
