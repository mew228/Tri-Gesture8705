'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { TrackData } from '@/lib/discovery';
import {
  Play, Pause, Music2, ChevronRight, ChevronLeft, ChevronUp,
  Heart, ExternalLink
} from 'lucide-react';
import { stringToGradient } from '@/lib/utils';

interface SwipeCardProps {
  track: TrackData;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onLike: () => void;
  isLiked: boolean;
  isActive: boolean;
}

function getAppleMusicUrl(track: TrackData) {
  return `https://music.apple.com/search?term=${encodeURIComponent(`${track.title} ${track.artist}`)}`;
}

// ────────────────────────────────────────────────────────────
// SwipeCard — wrapped in React.memo to skip re-renders when
// the parent re-renders for unrelated reasons (audio progress etc.)
// ────────────────────────────────────────────────────────────
const SwipeCard = memo(function SwipeCard({
  track,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onLike,
  isLiked,
  isActive,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // useTransform is hardware-accelerated — runs on compositor thread
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  // Progress stored in a ref, only flushed to state at throttled intervals
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastProgressFlush = useRef(0);

  const fallback = stringToGradient(track.artist || 'Unknown');
  const hasArt = !!track.albumArt && !imgFailed;

  // Reset when track changes
  useEffect(() => {
    setImgFailed(false);
    setIsPlaying(false);
    setProgress(0);
    progressRef.current = 0;
    setDuration(0);
  }, [track.id]);

  // Auto-play / pause based on active state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track.previewUrl) return;
    if (isActive) {
      audio.volume = 0.5;
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [isActive, track.previewUrl]);

  // ── Audio progress — throttled to ~4fps via rAF batching ──
  // Instead of calling setState in every `timeupdate` event (which fires
  // at ~60Hz), we use requestAnimationFrame to batch updates. We further
  // throttle to a max of 4 state updates/second (250ms) to be extremely cheap.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration);

    const onTimeUpdate = () => {
      if (!audio.duration) return;
      progressRef.current = audio.currentTime / audio.duration;

      // Cancel any pending frame
      if (rafRef.current !== null) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const now = performance.now();
        // Only flush to React state at most every 250ms
        if (now - lastProgressFlush.current >= 250) {
          lastProgressFlush.current = now;
          setProgress(progressRef.current);
        }
      });
    };

    audio.addEventListener('timeupdate', onTimeUpdate, { passive: true });
    audio.addEventListener('loadedmetadata', onLoaded, { passive: true });

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [track.previewUrl]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const { offset, velocity } = info;
      const absX = Math.abs(offset.x);
      const absY = Math.abs(offset.y);

      if (absX > absY) {
        if (absX > 70 || Math.abs(velocity.x) > 350) {
          offset.x > 0 ? onSwipeRight() : onSwipeLeft();
        }
      } else if (offset.y < -70 || velocity.y < -350) {
        onSwipeUp();
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp]
  );

  const togglePlay = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    },
    [isPlaying]
  );

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  }, []);

  return (
    <motion.div
      style={{ x, y, rotate }}
      drag={isActive}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.4}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      // swipe-card-composited: targeted will-change only on this element
      className="absolute select-none touch-none swipe-card-composited"
      onTouchStart={(e) => { if (isActive) e.stopPropagation(); }}
    >
      {/* contain: layout style — isolates this card's repaints from the rest of the page */}
      <div
        className="relative rounded-[36px] overflow-hidden shadow-2xl"
        style={{
          width: 'min(88vw, 340px)',
          height: 'min(78dvh, 620px)',
          contain: 'layout style',
        }}
      >
        {/* ── Blurred Background ───────────────────────────────── */}
        {/* Uses a pseudo-div rather than filter on the img itself.
            CSS filter on an <img> forces a raster copy; using a background-image
            on a div lets the browser skip that extra blit on some engines. */}
        <div
          className="absolute inset-0 scale-110"
          style={{
            backgroundImage: hasArt ? `url("${track.albumArt}")` : undefined,
            background: hasArt ? undefined : fallback,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            // Reduced blur from 20→14px: same visual effect, ~2× cheaper on GPU
            filter: 'blur(14px) brightness(0.28) saturate(1.6)',
            // Promoted to its own layer so blur doesn't repaint the parent
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        />

        {/* Glass overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />

        {/* ── Swipe tint overlays ───────────────────────────────── */}
        {/* These run on the compositor thread via motion values — zero JS cost */}
        <motion.div
          className="absolute inset-0 bg-green-400/20 rounded-[36px] flex items-start justify-end p-5"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-green-300 font-black text-2xl tracking-widest border-4 border-green-300/80 rounded-2xl px-3 py-1 rotate-[-15deg]">
            LIKE ♥
          </span>
        </motion.div>
        <motion.div
          className="absolute inset-0 bg-red-400/20 rounded-[36px] flex items-start justify-start p-5"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-red-300 font-black text-2xl tracking-widest border-4 border-red-300/80 rounded-2xl px-3 py-1 rotate-[15deg]">
            SKIP ✕
          </span>
        </motion.div>

        {/* ── Top action bar ────────────────────────────────────── */}
        <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-20">
          {/* Like button — CSS active state instead of JS whileTap */}
          <button
            onClick={(e) => { e.stopPropagation(); onLike(); }}
            className="btn-tap w-11 h-11 rounded-full bg-black/50 border border-white/15 flex items-center justify-center"
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart
              size={20}
              className={isLiked ? 'text-pink-400 fill-pink-400' : 'text-white/50'}
            />
          </button>

          <a
            href={getAppleMusicUrl(track)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="btn-tap w-11 h-11 rounded-full bg-black/50 border border-white/15 flex items-center justify-center text-white/50"
            title="Open in Apple Music"
            aria-label="Open in Apple Music"
          >
            <ExternalLink size={16} />
          </a>
        </div>

        {/* ── Content ──────────────────────────────────────────── */}
        <div className="absolute inset-0 flex flex-col">
          {/* Album Art */}
          <div className="relative flex-[3] flex items-center justify-center px-6 pt-16">
            {hasArt ? (
              <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={track.albumArt}
                  alt={track.title}
                  // album-art class applies image-rendering: auto (high quality bicubic)
                  className="album-art w-full h-full object-cover"
                  onError={() => setImgFailed(true)}
                  draggable={false}
                  loading="eager"
                  // @ts-expect-error — fetchpriority is a valid HTML attribute
                  fetchpriority="high"
                  decoding="async"
                />
                {isPlaying && (
                  <div
                    className="absolute inset-0 rounded-2xl border-2 border-white/20 pointer-events-none"
                    style={{
                      boxShadow: '0 0 20px rgba(167, 139, 250, 0.25)',
                      animation: 'pulse-subtle 2.5s ease-in-out infinite',
                    }}
                  />
                )}
              </div>
            ) : (
              <div
                className="w-full h-full rounded-2xl flex items-center justify-center shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
                style={{ background: fallback }}
              >
                <Music2 size={64} className="text-white/20" />
              </div>
            )}

            {/* Play / Pause button */}
            <button
              onClick={togglePlay}
              disabled={!track.previewUrl}
              className="btn-tap absolute bottom-3 right-9 w-14 h-14 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying
                ? <Pause size={22} fill="white" strokeWidth={0} />
                : <Play size={22} fill="white" strokeWidth={0} className="ml-0.5" />}
            </button>
          </div>

          {/* ── Audio Progress Bar ────────────────────────────── */}
          {track.previewUrl && (
            <div className="px-6 pt-3">
              <div
                className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer active:h-2 transition-all"
                onClick={handleSeek}
                role="slider"
                aria-label="Audio progress"
                aria-valuenow={Math.round(progress * 100)}
              >
                {/* Width change on progress bar is cheap — it's a small inner div */}
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-white/25 mt-1 font-medium tabular-nums">
                <span>{formatTime(progress * duration)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {/* Info section */}
          <div className="flex-[2] flex flex-col justify-between px-6 pb-4 pt-2">
            <div>
              <h2 className="text-white font-bold text-xl leading-tight tracking-tight font-display line-clamp-1">
                {track.title}
              </h2>
              <p className="text-white/55 font-medium mt-0.5 text-sm truncate">{track.artist}</p>

              <div className="flex gap-2 mt-2 flex-wrap">
                {track.genre && (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-white/8 text-cyan-300 border border-cyan-400/20">
                    {track.genre}
                  </span>
                )}
                {!track.previewUrl && (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-white/5 text-white/25 border border-white/10">
                    No Preview
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons — CSS active states, no Framer Motion overhead */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                onClick={(e) => { e.stopPropagation(); onSwipeLeft(); }}
                className="btn-tap flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-white/5 border border-white/10"
                aria-label="Random track"
              >
                <ChevronLeft size={16} className="text-white/60" />
                <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-white/40">Random</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); onSwipeUp(); }}
                className="btn-tap flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-white/5 border border-white/10"
                aria-label="Similar track"
              >
                <ChevronUp size={16} className="text-white/60" />
                <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-white/40">Similar</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); onSwipeRight(); }}
                className="btn-tap flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-white/5 border border-white/10"
                aria-label="Deep dive into artist"
              >
                <ChevronRight size={16} className="text-white/60" />
                <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-white/40">Deep Dive</span>
              </button>
            </div>
          </div>
        </div>

        {/* Hidden audio element */}
        {track.previewUrl && (
          <audio
            ref={audioRef}
            src={track.previewUrl}
            loop
            preload="metadata"
          />
        )}
      </div>
    </motion.div>
  );
});

export default SwipeCard;

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
