'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  X,
  Film,
  Music,
  Check,
  Sparkles,
  Zap,
  HardDrive,
  Layers,
} from 'lucide-react';
import { useDownloadStore, type DownloadType } from '@/store/useDownloadStore';
import { toast } from 'sonner';

export interface MediaDownloadItem {
  id: string;
  youtubeId?: string;
  title: string;
  thumbnail?: string;
  channelName?: string;
  duration?: string | number;
  defaultType?: DownloadType;
  rawUrl?: string;
}

interface FormatOption {
  id: string;
  label: string;
  quality: string;
  format: 'MP4' | 'MP3' | 'AAC';
  type: DownloadType;
  fileSize: string;
  badge?: string;
  badgeColor?: string;
  description: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  // Video Formats
  {
    id: 'video_1080p',
    label: '1080p Full HD',
    quality: '1080p',
    format: 'MP4',
    type: 'video',
    fileSize: '~78.4 MB',
    badge: '1080p',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    description: 'Crisp Full HD • 60fps Ultra Clarity',
  },
  {
    id: 'video_720p',
    label: '720p HD',
    quality: '720p',
    format: 'MP4',
    type: 'video',
    fileSize: '~42.1 MB',
    badge: '720p',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    description: 'High Definition • Balanced Speed & Size',
  },
  {
    id: 'video_360p',
    label: '360p Standard',
    quality: '360p',
    format: 'MP4',
    type: 'video',
    fileSize: '~16.5 MB',
    badge: '360p',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    description: 'Data Saver • Fast Download',
  },
  // Audio Formats
  {
    id: 'audio_320k',
    label: 'High Quality (MP3 - 320kbps)',
    quality: '320kbps',
    format: 'MP3',
    type: 'audio',
    fileSize: '~9.8 MB',
    badge: '320k',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    description: 'Master Audio • 320 kbps Studio Fidelity',
  },
  {
    id: 'audio_160k',
    label: 'Standard (AAC - 160kbps)',
    quality: '160kbps',
    format: 'AAC',
    type: 'audio',
    fileSize: '~4.2 MB',
    badge: 'AAC',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    description: 'Optimized Audio • 160 kbps Fast Stream',
  },
];

interface MediaDownloadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaDownloadItem | null;
}

export default function MediaDownloadSheet({
  isOpen,
  onClose,
  media,
}: MediaDownloadSheetProps) {
  const addDownload = useDownloadStore((s) => s.addDownload);

  // Default selection based on media hint
  const [selectedFormatId, setSelectedFormatId] = useState<string>(() => {
    return media?.defaultType === 'audio' ? 'audio_320k' : 'video_720p';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync default selection when media changes
  React.useEffect(() => {
    if (media) {
      setSelectedFormatId(
        media.defaultType === 'audio' ? 'audio_320k' : 'video_720p'
      );
    }
  }, [media]);

  if (!media) return null;

  const selectedOption =
    FORMAT_OPTIONS.find((f) => f.id === selectedFormatId) || FORMAT_OPTIONS[1];

  const handleStartDownload = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Build internal stream URL with parameters for background queue
      const videoKey = media.youtubeId || media.id;
      const downloadStreamUrl = `/api/download/stream?v=${encodeURIComponent(
        videoKey
      )}&type=${selectedOption.type}&quality=${encodeURIComponent(
        selectedOption.quality
      )}&title=${encodeURIComponent(media.title)}`;

      const downloadTitle = `${media.title} [${selectedOption.quality}]`;

      // Trigger background queue manager
      await addDownload(downloadStreamUrl, downloadTitle, selectedOption.type);

      // Toast notification as required
      toast.success('Download started in background!', {
        description: `${selectedOption.label} • ${selectedOption.fileSize}`,
        duration: 3500,
        action: {
          label: 'View Queue',
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.location.href = '/downloads';
            }
          },
        },
      });

      // Close bottom sheet immediately without disrupting playback
      onClose();
    } catch (err) {
      console.error('[MediaDownloadSheet] Error initiating download:', err);
      toast.error('Failed to initiate download. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const videoOptions = FORMAT_OPTIONS.filter((f) => f.type === 'video');
  const audioOptions = FORMAT_OPTIONS.filter((f) => f.type === 'audio');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-end justify-center pointer-events-auto">
          {/* AMOLED Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-[2px]"
          />

          {/* Bottom Sheet Modal (#0D0D0D AMOLED) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-xl bg-[#0D0D0D] border-t border-neutral-800/80 rounded-t-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[88vh] z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="pt-3 pb-1 flex items-center justify-center">
              <div className="w-12 h-1.5 bg-neutral-700/60 rounded-full" />
            </div>

            {/* Header / Media Metadata */}
            <div className="px-5 pt-2 pb-3 border-b border-neutral-800/60 flex items-start gap-3.5">
              {/* Media Thumbnail */}
              <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 flex-shrink-0">
                {media.thumbnail ? (
                  <img
                    src={media.thumbnail}
                    alt={media.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <Film className="w-6 h-6" />
                  </div>
                )}
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-bold text-white uppercase tracking-wider">
                  {media.defaultType || 'Media'}
                </div>
              </div>

              {/* Title & Channel */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-snug line-clamp-2">
                  {media.title}
                </p>
                {media.channelName && (
                  <p className="text-neutral-400 text-xs mt-1 truncate">
                    {media.channelName}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-purple-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Smart Downloader Pro
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Format Selector List */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin scrollbar-thumb-neutral-800">
              {/* VIDEO FORMATS SECTION */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                      Video Formats (MP4)
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    H.264 / AAC
                  </span>
                </div>

                <div className="space-y-2">
                  {videoOptions.map((opt) => {
                    const isSelected = selectedFormatId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedFormatId(opt.id)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-purple-950/30 border-purple-500/70 shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                            : 'bg-[#161616] border-neutral-800/80 hover:border-neutral-700/80 hover:bg-[#1c1c1c]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Selection indicator circle */}
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'bg-purple-600 border-purple-500 text-white'
                                : 'border-neutral-700 bg-neutral-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white truncate">
                                {opt.label}
                              </span>
                              {opt.badge && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${opt.badgeColor}`}
                                >
                                  {opt.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                              {opt.description}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-bold text-neutral-300 font-mono">
                            {opt.fileSize}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AUDIO FORMATS SECTION */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                      Audio Formats (MP3 / AAC)
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    HQ Audio Track
                  </span>
                </div>

                <div className="space-y-2">
                  {audioOptions.map((opt) => {
                    const isSelected = selectedFormatId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedFormatId(opt.id)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-purple-950/30 border-purple-500/70 shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                            : 'bg-[#161616] border-neutral-800/80 hover:border-neutral-700/80 hover:bg-[#1c1c1c]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Selection indicator circle */}
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'bg-purple-600 border-purple-500 text-white'
                                : 'border-neutral-700 bg-neutral-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white truncate">
                                {opt.label}
                              </span>
                              {opt.badge && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${opt.badgeColor}`}
                                >
                                  {opt.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                              {opt.description}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-bold text-neutral-300 font-mono">
                            {opt.fileSize}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* In-App Offline Feature Note */}
              <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/60 flex items-center gap-3">
                <HardDrive className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Downloads are queued in the background and stored locally in your device storage for uninterrupted offline playback.
                </p>
              </div>
            </div>

            {/* Bottom Action CTA */}
            <div className="p-4 bg-[#0D0D0D] border-t border-neutral-800/80 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3.5 rounded-xl border border-neutral-800 text-neutral-400 font-semibold text-sm hover:bg-neutral-900 active:scale-95 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStartDownload}
                disabled={isSubmitting}
                className="flex-1 py-3.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isSubmitting ? 'Starting...' : `Download Now (${selectedOption.quality})`}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
