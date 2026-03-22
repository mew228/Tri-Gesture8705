'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SwipeCard from '@/components/SwipeCard';
import LikedDrawer from '@/components/LikedDrawer';
import { useLikes } from '@/hooks/useLikes';
import {
  getExplorationTrack,
  getArtistTopTracks,
  getSmartDiscoveryTrack,
  TrackData,
} from '@/lib/discovery';
import { Loader2, Sparkles, Heart, Home as HomeIcon } from 'lucide-react';

const GENRES = ['pop', 'hiphop', 'rock', 'indie', 'electronic', 'jazz', 'rnb', 'latin'];

// ── Ambient Background ────────────────────────────────────────
// Separated into its own memoized component so that changes to the
// ambient background art do NOT re-render the card stack or buttons.
const AmbientBackground = memo(function AmbientBackground({
  albumArt,
}: { albumArt: string | null }) {
  const [currentArt, setCurrentArt] = useState(albumArt);
  const [nextArt, setNextArt] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!albumArt || albumArt === currentArt) return;
    // Crossfade: load next art over 600ms, then swap
    setNextArt(albumArt);
    setFading(true);
    const t = setTimeout(() => {
      setCurrentArt(albumArt);
      setNextArt(null);
      setFading(false);
    }, 650);
    return () => clearTimeout(t);
  }, [albumArt]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none ambient-bg"
      aria-hidden="true"
    >
      {/* Current art layer */}
      {currentArt && (
        <div
          className="absolute inset-0 scale-150"
          style={{
            backgroundImage: `url("${currentArt}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(60px) saturate(2) brightness(0.22)',
            // CSS opacity transition — compositor thread only, 0 JS cost
            opacity: fading ? 0 : 1,
            transition: 'opacity 650ms ease-in-out',
            willChange: 'opacity',
            transform: 'translateZ(0)',
          }}
        />
      )}
      {/* Incoming art layer — starts visible, fades in */}
      {nextArt && (
        <div
          className="absolute inset-0 scale-150"
          style={{
            backgroundImage: `url("${nextArt}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(60px) saturate(2) brightness(0.22)',
            opacity: fading ? 1 : 0,
            transition: 'opacity 650ms ease-in-out',
            willChange: 'opacity',
            transform: 'translateZ(0)',
          }}
        />
      )}
      {/* Dark vignette overlays — static, no cost */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/70" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 100%)' }} />
    </div>
  );
});

// ── Queue dot indicators ──────────────────────────────────────
const QueueDots = memo(function QueueDots({ currentIndex }: { currentIndex: number }) {
  return (
    <div
      className="absolute flex gap-1 z-20"
      style={{ top: 'max(60px, calc(env(safe-area-inset-top, 0px) + 48px))', left: '50%', transform: 'translateX(-50%)' }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < (currentIndex % 5) + 1 ? 'w-6 bg-violet-400' : 'w-1.5 bg-white/10'
          }`}
        />
      ))}
    </div>
  );
});

export default function Home() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [queue, setQueue] = useState<TrackData[]>([]);
  // Use a Set ref for O(1) dedup (instead of `.some()` on every append)
  const queueIds = useRef(new Set<string>());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isFetchingMore = useRef(false);

  const { likedTracks, toggleLike, isLiked, removeLike } = useLikes();

  // Memoized current track — avoids re-deriving on every render
  const currentTrack = useMemo(() => queue[currentIndex] ?? null, [queue, currentIndex]);

  // Preload next card's art into browser cache
  useEffect(() => {
    const next = queue[currentIndex + 1];
    if (!next?.albumArt) return;
    const img = new Image();
    img.src = next.albumArt;
  }, [queue, currentIndex]);

  // Helper: add track(s) to queue, deduplicating via Set
  const addToQueue = useCallback((tracks: TrackData | TrackData[]) => {
    const arr = Array.isArray(tracks) ? tracks : [tracks];
    const fresh = arr.filter((t) => !queueIds.current.has(t.id));
    if (fresh.length === 0) return;
    fresh.forEach((t) => queueIds.current.add(t.id));
    setQueue((prev) => [...prev, ...fresh]);
  }, []);

  // Load initial tracks when genre is selected
  useEffect(() => {
    if (selectedGenre && queue.length === 0 && !loading && !error) {
      setLoading(true);
      Promise.allSettled([
        getExplorationTrack(selectedGenre),
        getExplorationTrack(selectedGenre),
        getExplorationTrack(selectedGenre),
      ]).then((results) => {
        const validTracks = results
          .filter((r): r is PromiseFulfilledResult<TrackData> => r.status === 'fulfilled' && r.value !== null)
          .map((r) => r.value);
        if (validTracks.length === 0) {
          setError('No tracks found. Please check that your LASTFM_API_KEY is set and restart the server.');
        } else {
          addToQueue(validTracks);
        }
      }).finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenre]);

  // Pre-fetch: keep 3+ tracks ahead
  useEffect(() => {
    if (!selectedGenre || queue.length === 0 || queue.length - currentIndex > 3 || isFetchingMore.current || error) return;
    isFetchingMore.current = true;
    getExplorationTrack(selectedGenre)
      .then((track) => { if (track) addToQueue(track); })
      .catch(() => {})
      .finally(() => { isFetchingMore.current = false; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, queue.length]);

  const handleSwipeLeft = useCallback(async () => {
    setCurrentIndex((prev) => prev + 1);
    const newTrack = await getExplorationTrack();
    if (newTrack) addToQueue(newTrack);
  }, [addToQueue]);

  const handleSwipeRight = useCallback(async (track: TrackData) => {
    setCurrentIndex((prev) => prev + 1);
    const newTracks = await getArtistTopTracks(track.artist);
    if (newTracks.length > 0) {
      addToQueue(newTracks.slice(0, 3));
    } else {
      const fallback = await getExplorationTrack();
      if (fallback) addToQueue(fallback);
    }
  }, [addToQueue]);

  const handleSwipeUp = useCallback(async (track: TrackData) => {
    setCurrentIndex((prev) => prev + 1);
    const newTrack = await getSmartDiscoveryTrack(track.artist, track.id);
    if (newTrack) addToQueue(newTrack);
  }, [addToQueue]);

  // Reset handler
  const handleReset = useCallback(() => {
    setSelectedGenre(null);
    setQueue([]);
    queueIds.current.clear();
    setCurrentIndex(0);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!selectedGenre || queue.length === 0 || loading) return;
    const current = queue[currentIndex];
    if (!current) return;

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || drawerOpen) return;
      switch (e.key) {
        case 'ArrowLeft':  handleSwipeLeft(); break;
        case 'ArrowRight': handleSwipeRight(current); break;
        case 'ArrowUp':    e.preventDefault(); handleSwipeUp(current); break;
        case 'l': case 'L': toggleLike(current); break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedGenre, queue, currentIndex, loading, drawerOpen, handleSwipeLeft, handleSwipeRight, handleSwipeUp, toggleLike]);

  // ─── Landing page ────────────────────────────────────────────
  if (!selectedGenre) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center p-8 relative overflow-hidden text-center bg-[#050505]">
        {/* Static ambient orbs — no animations, just CSS gradients */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" style={{ opacity: 0.6 }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none" style={{ opacity: 0.5 }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative z-10 max-w-2xl w-full"
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <Sparkles className="text-white" size={28} />
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold font-display mb-4 tracking-tight text-white">
            Discover Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Vibe</span>
          </h1>
          <p className="text-white/40 mb-10 text-base md:text-lg font-medium max-w-sm mx-auto leading-relaxed">
            Swipe through world-class sounds. Pick a starting genre.
          </p>

          {/* Genre grid — CSS btn-tap instead of Framer Motion per-button */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
            {GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className="btn-tap px-6 py-5 rounded-[22px] bg-white/[0.04] border border-white/[0.08]"
              >
                <span className="text-base font-bold capitalize tracking-tight text-white/70">
                  {genre}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </main>
    );
  }

  // ─── App view ────────────────────────────────────────────────
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#050505] overflow-hidden relative">
      {/* Memoized ambient background — re-renders independently of card stack */}
      <AmbientBackground albumArt={currentTrack?.albumArt ?? null} />

      {/* Home button */}
      <button
        onClick={handleReset}
        className="btn-tap fixed z-30 p-3 rounded-full bg-black/50 border border-white/10"
        style={{
          top: 'max(20px, env(safe-area-inset-top, 20px))',
          left: 'max(20px, env(safe-area-inset-left, 20px))',
        }}
        title="Go home"
        aria-label="Go home"
      >
        <HomeIcon size={18} className="text-white/50" />
      </button>

      {/* Liked Tracks button */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="btn-tap fixed z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/50 border border-white/10"
        style={{
          top: 'max(20px, env(safe-area-inset-top, 20px))',
          right: 'max(20px, env(safe-area-inset-right, 20px))',
        }}
        aria-label="Liked tracks"
      >
        <Heart size={14} className={likedTracks.length > 0 ? 'text-pink-400 fill-pink-400' : 'text-white/40'} />
        <span className="text-white/60 text-xs font-bold">
          {likedTracks.length > 0 ? likedTracks.length : 'Liked'}
        </span>
      </button>

      <LikedDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tracks={likedTracks}
        onRemove={removeLike}
      />

      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center bg-white/3 border border-white/10 p-8 rounded-[32px] text-red-100 max-w-sm text-center z-50 mx-6"
          >
            <p className="font-bold text-xl mb-2 font-display">Something went wrong</p>
            <p className="text-white/40 text-sm leading-relaxed mb-6">{error}</p>
            <button
              onClick={() => { setError(null); setSelectedGenre(null); }}
              className="btn-tap w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold"
            >
              Try Again
            </button>
          </motion.div>
        ) : queue.length === 0 || loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center text-center px-10"
          >
            <div className="relative mb-6">
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
              <div className="absolute inset-0 bg-violet-400/20 blur-xl" />
            </div>
            <p className="text-xl font-bold font-display text-white tracking-tight mb-1">Tuning the Frequency</p>
            <p className="text-white/30 text-sm">Calibrating your stream...</p>
          </motion.div>
        ) : (
          <div key="cards" className="relative w-full flex items-center justify-center h-full">
            <QueueDots currentIndex={currentIndex} />

            <div
              className="relative w-full max-w-[380px] flex items-center justify-center"
              style={{ height: 'min(80dvh, 620px)' }}
            >
              {/* Next card (behind) — inactive, no audio, no will-change */}
              {currentIndex + 1 < queue.length && (
                <SwipeCard
                  key={`next-${queue[currentIndex + 1].id}`}
                  track={queue[currentIndex + 1]}
                  onSwipeLeft={() => {}}
                  onSwipeRight={() => {}}
                  onSwipeUp={() => {}}
                  onLike={() => {}}
                  isLiked={false}
                  isActive={false}
                />
              )}

              {/* Ghost card if out of tracks */}
              {currentIndex >= queue.length && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 rounded-[40px] border border-white/5 flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
                </motion.div>
              )}

              {/* Current card */}
              {currentIndex < queue.length && (
                <SwipeCard
                  key={`curr-${queue[currentIndex].id}`}
                  track={queue[currentIndex]}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={() => handleSwipeRight(queue[currentIndex])}
                  onSwipeUp={() => handleSwipeUp(queue[currentIndex])}
                  onLike={() => toggleLike(queue[currentIndex])}
                  isLiked={isLiked(queue[currentIndex].id)}
                  isActive={true}
                />
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Keyboard hint — desktop only */}
      {selectedGenre && !loading && !error && (
        <p
          className="fixed z-20 text-white/20 text-[9px] font-medium tracking-[0.2em] uppercase hidden md:block whitespace-nowrap"
          style={{ bottom: 'max(16px, env(safe-area-inset-bottom, 16px))', left: '50%', transform: 'translateX(-50%)' }}
        >
          ← → ↑ &nbsp;arrow keys &nbsp;·&nbsp; L to like
        </p>
      )}
    </main>
  );
}
