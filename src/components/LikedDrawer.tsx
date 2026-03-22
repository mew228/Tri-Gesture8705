'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ExternalLink, Music2, Trash2 } from 'lucide-react';
import { TrackData } from '@/lib/discovery';
import { stringToGradient } from '@/lib/utils';

interface LikedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: TrackData[];
  onRemove: (id: string) => void;
}

function getAppleMusicUrl(track: TrackData) {
  return `https://music.apple.com/search?term=${encodeURIComponent(`${track.title} ${track.artist}`)}`;
}

// ── Track row — memoized so list doesn't re-render all rows on add/remove ──
const TrackRow = memo(function TrackRow({
  track,
  onRemove,
}: { track: TrackData; onRemove: (id: string) => void }) {
  const fallback = stringToGradient(track.artist || 'Unknown');
  return (
    <motion.div
      layout={false} // Disable layout animation — it triggers per-item reflow
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] active:bg-white/[0.06] transition-colors"
    >
      {/* Art Thumbnail */}
      <div
        className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden"
        style={{ background: fallback }}
      >
        {track.albumArt && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.albumArt}
            alt={track.title}
            className="album-art w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{track.title}</p>
        <p className="text-white/40 text-xs truncate">{track.artist}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <a
          href={getAppleMusicUrl(track)}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in Apple Music"
          aria-label={`Open ${track.title} in Apple Music`}
          className="btn-tap w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50"
        >
          <ExternalLink size={13} />
        </a>
        <button
          onClick={() => onRemove(track.id)}
          title="Remove"
          aria-label={`Remove ${track.title}`}
          className="btn-tap w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  );
});

const LikedDrawer = memo(function LikedDrawer({ isOpen, onClose, tracks, onRemove }: LikedDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-40"
            aria-hidden="true"
          />

          {/* Drawer — slides in from right, spring tuned for 120Hz */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            // Fast spring that settles within ~280ms — smooth at 60Hz and 120Hz
            transition={{ type: 'spring', stiffness: 400, damping: 38, mass: 0.8 }}
            className="fixed right-0 top-0 h-full w-full sm:max-w-[360px] z-50 flex flex-col"
            style={{
              background: 'linear-gradient(160deg, #0f0f16 0%, #12121e 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              // Isolated compositing layer for the slide animation
              willChange: 'transform',
            }}
            role="dialog"
            aria-label="Liked tracks"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 pb-5 flex-shrink-0"
              style={{ paddingTop: 'max(24px, env(safe-area-inset-top, 24px))' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/20 flex items-center justify-center">
                  <Heart size={16} className="text-pink-400 fill-pink-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg font-display leading-tight">Liked</h2>
                  <p className="text-white/30 text-xs">{tracks.length} track{tracks.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="btn-tap w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Track List */}
            <div
              className="flex-1 overflow-y-auto px-4 space-y-2"
              style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))' }}
            >
              {tracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <Music2 size={28} className="text-white/15" />
                  </div>
                  <p className="text-white/25 text-sm font-medium">No liked tracks yet</p>
                  <p className="text-white/15 text-xs mt-1">Tap ♥ on any card to save it</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {tracks.map((track) => (
                    <TrackRow key={track.id} track={track} onRemove={onRemove} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default LikedDrawer;
