'use client';

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { TrackData } from '@/lib/discovery';
import {
  Play, Pause, Music2, ChevronRight, ChevronLeft, ChevronUp,
  Heart, ExternalLink
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
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
  const query = encodeURIComponent(`${track.title} ${track.artist}`);
  return `https://music.apple.com/search?term=${query}`;
}

export default function SwipeCard({
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
  const rotate = useTransform(x, [-200, 200], [-12, 12]);

  // Swipe tint overlays
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -20], [1, 0]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fallback = stringToGradient(track.artist || 'Unknown');
  const hasArt = !!track.albumArt && !imgFailed;

  // Reset when track changes
  useEffect(() => {
    setImgFailed(false);
    setIsPlaying(false);
    setProgress(0);
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

  // Audio progress tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onLoaded = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [track.previewUrl]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const { offset, velocity } = info;
      const absX = Math.abs(offset.x);
      const absY = Math.abs(offset.y);

      if (absX > absY) {
        if (absX > 80 || Math.abs(velocity.x) > 400) {
          offset.x > 0 ? onSwipeRight() : onSwipeLeft();
        }
      } else if (offset.y < -80 || velocity.y < -400) {
        onSwipeUp();
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp]
  );

  const togglePlay = useCallback(
    (e: React.MouseEvent) => {
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
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: 'grabbing' }}
      className="absolute select-none cursor-grab"
    >
      <div
        className="relative rounded-[40px] overflow-hidden shadow-2xl"
        style={{
          width: 'min(88vw, 340px)',
          height: 'min(80vh, 620px)',
        }}
      >
        {/* === Blurred Background === */}
        <div
          className="absolute inset-0 scale-110"
          style={{
            background: hasArt
              ? `url("${track.albumArt}") center/cover no-repeat`
              : fallback,
            filter: 'blur(28px) brightness(0.3) saturate(1.8)',
          }}
        />

        {/* === Glass overlay === */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />

        {/* === Swipe tint overlays === */}
        <motion.div
          className="absolute inset-0 bg-green-400/20 rounded-[40px] flex items-start justify-end p-6"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-green-300 font-black text-2xl tracking-widest border-4 border-green-300/80 rounded-2xl px-3 py-1 rotate-[-15deg]">
            LIKE ♥
          </span>
        </motion.div>
        <motion.div
          className="absolute inset-0 bg-red-400/20 rounded-[40px] flex items-start justify-start p-6"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-red-300 font-black text-2xl tracking-widest border-4 border-red-300/80 rounded-2xl px-3 py-1 rotate-[15deg]">
            SKIP ✕
          </span>
        </motion.div>

        {/* === Top action bar === */}
        <div className="absolute top-5 left-0 right-0 flex items-center justify-between px-5 z-20">
          {/* Like button */}
          <motion.button
            whileTap={{ scale: 0.82 }}
            onClick={(e) => { e.stopPropagation(); onLike(); }}
            className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center transition-all"
          >
            <Heart
              size={20}
              className={isLiked ? 'text-pink-400 fill-pink-400' : 'text-white/50'}
            />
          </motion.button>

          {/* Apple Music link */}
          <a
            href={getAppleMusicUrl(track)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/50 hover:text-white transition-all"
            title="Open in Apple Music"
          >
            <ExternalLink size={16} />
          </a>
        </div>

        {/* === Content === */}
        <div className="absolute inset-0 flex flex-col">
          {/* Album Art — top 55% */}
          <div className="relative flex-[3] flex items-center justify-center px-7 pt-16">
            {hasArt ? (
              <div className="w-full h-full relative rounded-3xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={track.albumArt}
                  alt={track.title}
                  className="w-full h-full object-cover"
                  onError={() => setImgFailed(true)}
                  draggable={false}
                />
                {isPlaying && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-3xl border-4 border-white/10 pointer-events-none"
                    style={{
                      background: 'conic-gradient(from 0deg, transparent 70%, rgba(255,255,255,0.12) 100%)',
                    }}
                  />
                )}
              </div>
            ) : (
              <div
                className="w-full h-full rounded-3xl flex items-center justify-center shadow-[0_16px_48px_rgba(0,0,0,0.7)]"
                style={{ background: fallback }}
              >
                <Music2 size={72} className="text-white/20" />
              </div>
            )}

            {/* Play / Pause button */}
            <button
              onClick={togglePlay}
              disabled={!track.previewUrl}
              className="absolute bottom-3 right-10 w-14 h-14 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all active:scale-90 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
            >
              {isPlaying
                ? <Pause size={22} fill="white" strokeWidth={0} />
                : <Play size={22} fill="white" strokeWidth={0} className="ml-0.5" />}
            </button>
          </div>

          {/* === Audio Progress Bar === */}
          {track.previewUrl && (
            <div className="px-7 pt-3">
              <div
                className="w-full h-1 bg-white/10 rounded-full cursor-pointer group"
                onClick={handleSeek}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full relative"
                  style={{ width: `${progress * 100}%` }}
                >
                  {/* Scrub thumb */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              </div>
              <div className="flex justify-between text-[9px] text-white/25 mt-1 font-medium tabular-nums">
                <span>{formatTime(progress * duration)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {/* Info section */}
          <div className="flex-[2] flex flex-col justify-between px-7 pb-5 pt-2">
            <div>
              <h2 className="text-white font-bold text-2xl leading-tight tracking-tight font-display line-clamp-1">
                {track.title}
              </h2>
              <p className="text-white/55 font-medium mt-0.5 text-base truncate">{track.artist}</p>

              {/* Badges */}
              <div className="flex gap-2 mt-2.5 flex-wrap">
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

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.92 }}
                onClick={(e) => { e.stopPropagation(); onSwipeLeft(); }}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-white/5 border border-white/10 transition-colors"
              >
                <ChevronLeft size={16} className="text-white/50" />
                <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-white/35">Random</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.92 }}
                onClick={(e) => { e.stopPropagation(); onSwipeUp(); }}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-white/5 border border-white/10 transition-colors"
              >
                <ChevronUp size={16} className="text-white/50" />
                <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-white/35">Similar</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.92 }}
                onClick={(e) => { e.stopPropagation(); onSwipeRight(); }}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-white/5 border border-white/10 transition-colors"
              >
                <ChevronRight size={16} className="text-white/50" />
                <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-white/35">Deep Dive</span>
              </motion.button>
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
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
