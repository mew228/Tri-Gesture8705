'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

export default function Home() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [queue, setQueue] = useState<TrackData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isFetchingMore = useRef(false);

  const { likedTracks, toggleLike, isLiked, removeLike } = useLikes();

  // Load initial tracks when genre is selected
  useEffect(() => {
    if (selectedGenre && queue.length === 0 && !loading && !error) {
      setLoading(true);
      // allSettled: one slow/failed track won't block the other two
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
          setQueue(validTracks);
        }
      }).finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenre]); // intentionally minimal — only re-runs when genre changes

  // Pre-fetch: keep 3+ tracks ahead — intentionally minimal deps to avoid cascade
  useEffect(() => {
    if (!selectedGenre || queue.length === 0 || queue.length - currentIndex > 3 || isFetchingMore.current || error) return;
    isFetchingMore.current = true;
    getExplorationTrack(selectedGenre)
      .then((track) => {
        if (track) setQueue((prev) => prev.some((t) => t.id === track.id) ? prev : [...prev, track]);
      })
      .catch(() => {})
      .finally(() => { isFetchingMore.current = false; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, queue.length]); // ← `queue` object deliberately excluded

  const handleSwipeLeft = useCallback(async (track: TrackData) => {
    setCurrentIndex((prev) => prev + 1);
    const newTrack = await getExplorationTrack();
    if (newTrack) setQueue((prev) => [...prev, newTrack]);
  }, []);

  const handleSwipeRight = useCallback(async (track: TrackData) => {
    setCurrentIndex((prev) => prev + 1);
    const newTracks = await getArtistTopTracks(track.artist);
    if (newTracks.length > 0) {
      setQueue((prev) => [...prev, ...newTracks.slice(0, 3)]);
    } else {
      const fallback = await getExplorationTrack();
      if (fallback) setQueue((prev) => [...prev, fallback]);
    }
  }, []);

  const handleSwipeUp = useCallback(async (track: TrackData) => {
    setCurrentIndex((prev) => prev + 1);
    const newTrack = await getSmartDiscoveryTrack(track.artist, track.id);
    if (newTrack) setQueue((prev) => [...prev, newTrack]);
  }, []);

  // ⌨️ Keyboard shortcuts
  useEffect(() => {
    if (!selectedGenre || queue.length === 0 || loading) return;
    const current = queue[currentIndex];
    if (!current) return;

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || drawerOpen) return;
      switch (e.key) {
        case 'ArrowLeft':  handleSwipeLeft(current); break;
        case 'ArrowRight': handleSwipeRight(current); break;
        case 'ArrowUp':    e.preventDefault(); handleSwipeUp(current); break;
        case 'l': case 'L': toggleLike(current); break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedGenre, queue, currentIndex, loading, drawerOpen, handleSwipeLeft, handleSwipeRight, handleSwipeUp, toggleLike]);

  // ─── Landing page ────────────────────────────────────────────────────────────
  if (!selectedGenre) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center p-8 relative overflow-hidden text-center bg-[#050505]">
        {/* Ambient orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-900/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-2xl w-full"
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <Sparkles className="text-white" size={28} />
            </div>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold font-display mb-4 tracking-tight text-white">
            Discover Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Vibe</span>
          </h1>
          <p className="text-white/40 mb-10 text-base md:text-lg font-medium max-w-sm mx-auto leading-relaxed">
            Swipe through world-class sounds. Pick a starting genre.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
            {GENRES.map((genre, idx) => (
              <motion.button
                key={genre}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedGenre(genre)}
                className="group relative px-6 py-5 rounded-[22px] bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200"
              >
                <span className="text-base font-bold capitalize tracking-tight text-white/70 group-hover:text-white transition-colors">
                  {genre}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </main>
    );
  }

  // ─── App view ────────────────────────────────────────────────────────────────
  const currentTrack = queue[currentIndex] ?? null;

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#050505] overflow-hidden relative">
      {/* ══ Apple Music-style ambient background ══ */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Blurred album art fills the whole screen */}
        {currentTrack?.albumArt && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={currentTrack.albumArt}
            src={currentTrack.albumArt}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-150 transition-all duration-1000"
            style={{ filter: 'blur(120px) saturate(2.2) brightness(0.28)' }}
          />
        )}
        {/* Multi-stop dark vignette overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/70" />
        {/* Subtle radial dark centre so card is always readable */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 100%)' }} />
      </div>
      {/* Home button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => {
          setSelectedGenre(null);
          setQueue([]);
          setCurrentIndex(0);
        }}
        className="fixed top-5 left-5 z-30 p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-sm group"
        title="Go home"
      >
        <HomeIcon size={18} className="text-white/40 group-hover:text-white transition-colors" />
      </motion.button>

      {/* Liked Tracks button */}
      <motion.button
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setDrawerOpen(true)}
        className="fixed top-5 right-5 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-sm"
      >
        <Heart size={14} className={likedTracks.length > 0 ? 'text-pink-400 fill-pink-400' : 'text-white/40'} />
        <span className="text-white/60 text-xs font-bold">
          {likedTracks.length > 0 ? likedTracks.length : 'Liked'}
        </span>
      </motion.button>

      {/* Liked Drawer */}
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
            className="flex flex-col items-center bg-white/3 border border-white/10 p-10 rounded-[32px] text-red-100 max-w-sm text-center z-50 mx-6"
          >
            <p className="font-bold text-xl mb-2 font-display">Something went wrong</p>
            <p className="text-white/40 text-sm leading-relaxed mb-6">{error}</p>
            <button
              onClick={() => { setError(null); setSelectedGenre(null); }}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 transition-all rounded-2xl text-white font-bold"
            >
              Try Again
            </button>
          </motion.div>
        ) : queue.length === 0 || loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center text-center px-10"
          >
            <div className="relative mb-6">
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
              <div className="absolute inset-0 bg-violet-400/20 blur-xl animate-pulse" />
            </div>
            <p className="text-xl font-bold font-display text-white tracking-tight mb-1">Tuning the Frequency</p>
            <p className="text-white/30 text-sm">Calibrating your stream...</p>
          </motion.div>
        ) : (
          <div className="relative w-full flex items-center justify-center h-full">
            {/* Queue dots */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-1 z-20">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i < (currentIndex % 5) + 1 ? 'w-6 bg-violet-400' : 'w-1.5 bg-white/10'
                  }`}
                />
              ))}
            </div>

            <div className="relative w-full max-w-[380px] flex items-center justify-center" style={{ height: 'min(80vh, 620px)' }}>
              {/* Next card (behind) */}
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
                  onSwipeLeft={() => handleSwipeLeft(queue[currentIndex])}
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

      {/* Keyboard hint — fixed, always below cards, never overlapping */}
      {selectedGenre && !loading && !error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 text-white/20 text-[9px] font-medium tracking-[0.2em] uppercase hidden md:block whitespace-nowrap"
        >
          ← → ↑ &nbsp;arrow keys &nbsp;·&nbsp; L to like
        </motion.p>
      )}
    </main>
  );
}
