'use client';

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
  const query = encodeURIComponent(`${track.title} ${track.artist}`);
  return `https://music.apple.com/search?term=${query}`;
}

export default function LikedDrawer({ isOpen, onClose, tracks, onRemove }: LikedDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-[360px] z-50 flex flex-col"
            style={{
              background: 'linear-gradient(160deg, #0f0f16 0%, #12121e 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-12 pb-6 flex-shrink-0">
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
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
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
                  {tracks.map((track) => {
                    const fallback = stringToGradient(track.artist || 'Unknown');
                    return (
                      <motion.div
                        key={track.id}
                        layout
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 30, height: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] group transition-colors"
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
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{track.title}</p>
                          <p className="text-white/40 text-xs truncate">{track.artist}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={getAppleMusicUrl(track)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in Apple Music"
                            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/30 flex items-center justify-center text-white/40 hover:text-pink-400 transition-all"
                          >
                            <ExternalLink size={13} />
                          </a>
                          <button
                            onClick={() => onRemove(track.id)}
                            title="Remove"
                            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 flex items-center justify-center text-white/40 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
