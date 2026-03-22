'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TrackData } from '@/lib/discovery';

const STORAGE_KEY = 'tri_gesture_liked_tracks';

export function useLikes() {
  const [likedTracks, setLikedTracks] = useState<TrackData[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setLikedTracks(JSON.parse(stored));
    } catch {}
  }, []);

  const persist = (tracks: TrackData[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
    } catch {}
  };

  const toggleLike = useCallback((track: TrackData) => {
    setLikedTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      const next = exists ? prev.filter((t) => t.id !== track.id) : [track, ...prev];
      persist(next);
      return next;
    });
  }, []);

  // O(1) Set for isLiked lookups — avoids .some() array scan on every render
  const likedSet = useMemo(() => new Set(likedTracks.map((t) => t.id)), [likedTracks]);

  const isLiked = useCallback(
    (trackId: string) => likedSet.has(trackId),
    [likedSet]
  );

  const removeLike = useCallback((trackId: string) => {
    setLikedTracks((prev) => {
      const next = prev.filter((t) => t.id !== trackId);
      persist(next);
      return next;
    });
  }, []);

  return { likedTracks, toggleLike, isLiked, removeLike };
}
