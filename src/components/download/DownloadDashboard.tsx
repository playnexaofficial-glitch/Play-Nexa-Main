'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Pause,
  Play,
  X,
  Trash2,
  RotateCcw,
  Plus,
  Search,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Share2,
  HardDrive,
  Film,
  Music,
  FileText,
  Volume2,
  Maximize2,
  ChevronRight,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useDownloadStore,
  type DownloadItem,
  type DownloadType,
  getPlayableMediaUrl,
  deleteDownloadedMediaFile,
} from '@/store/useDownloadStore';
import { detectPlatform, isValidUrl } from '@/lib/urlDetector';

// ── Platform Icons & Badge Helpers ───────────────────────────────────────────

interface PlatformMeta {
  name: string;
  color: string;
  bg: string;
  iconText: string;
}

function getPlatformMeta(url: string, type: DownloadType): PlatformMeta {
  if (!url) {
    return type === 'audio'
      ? { name: 'Audio Track', color: '#10B981', bg: 'bg-emerald-500/10', iconText: '🎵' }
      : { name: 'Video File', color: '#7C3AED', bg: 'bg-purple-500/10', iconText: '🎬' };
  }

  const detected = detectPlatform(url);
  if (detected?.platform) {
    const p = detected.platform;
    return {
      name: p.name,
      color: p.color || '#7C3AED',
      bg: 'bg-neutral-800/80',
      iconText: p.emoji || '▶️',
    };
  }

  // Fallback domain detection
  const lower = url.toLowerCase();
  if (lower.includes('youtube') || lower.includes('youtu.be')) {
    return { name: 'YouTube', color: '#FF0000', bg: 'bg-red-500/10', iconText: '▶️' };
  }
  if (lower.includes('tiktok')) {
    return { name: 'TikTok', color: '#FE2C55', bg: 'bg-pink-500/10', iconText: '🎵' };
  }
  if (lower.includes('facebook') || lower.includes('fb.watch')) {
    return { name: 'Facebook', color: '#1877F2', bg: 'bg-blue-500/10', iconText: '👤' };
  }
  if (lower.includes('instagram')) {
    return { name: 'Instagram', color: '#E1306C', bg: 'bg-pink-500/10', iconText: '📸' };
  }
  if (lower.includes('twitter') || lower.includes('x.com')) {
    return { name: 'Twitter / X', color: '#1DA1F2', bg: 'bg-sky-500/10', iconText: '𝕏' };
  }
  if (lower.includes('soundcloud')) {
    return { name: 'SoundCloud', color: '#FF5500', bg: 'bg-orange-500/10', iconText: '☁️' };
  }

  return type === 'audio'
    ? { name: 'Audio Stream', color: '#10B981', bg: 'bg-emerald-500/10', iconText: '🎵' }
    : { name: 'Web Media', color: '#06B6D4', bg: 'bg-cyan-500/10', iconText: '🌐' };
}

type TabType = 'downloading' | 'completed';
type CategoryFilter = 'all' | 'video' | 'audio' | 'other';

interface DownloadDashboardProps {
  onClose?: () => void;
  isModal?: boolean;
}

export default function DownloadDashboard({ onClose, isModal = false }: DownloadDashboardProps) {
  const router = useRouter();

  // Store Hooks
  const downloads = useDownloadStore((state) => state.downloads);
  const maxConcurrent = useDownloadStore((state) => state.maxConcurrent);
  const addDownload = useDownloadStore((state) => state.addDownload);
  const pauseDownload = useDownloadStore((state) => state.pauseDownload);
  const resumeDownload = useDownloadStore((state) => state.resumeDownload);
  const cancelDownload = useDownloadStore((state) => state.cancelDownload);
  const retryDownload = useDownloadStore((state) => state.retryDownload);
  const clearCompleted = useDownloadStore((state) => state.clearCompleted);
  const pauseAll = useDownloadStore((state) => state.pauseAll);
  const resumeAll = useDownloadStore((state) => state.resumeAll);
  const retryAllFailed = useDownloadStore((state) => state.retryAllFailed);
  const setMaxConcurrent = useDownloadStore((state) => state.setMaxConcurrent);

  // Local State
  const [activeTab, setActiveTab] = useState<TabType>('downloading');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Add Download Input State
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [inputType, setInputType] = useState<DownloadType>('video');
  const [inputError, setInputError] = useState('');

  // Media Player State
  const [activeMediaItem, setActiveMediaItem] = useState<DownloadItem | null>(null);
  const [playableUrl, setPlayableUrl] = useState<string | null>(null);
  const [isPlayingMedia, setIsPlayingMedia] = useState(false);

  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<DownloadItem | null>(null);

  // Filtered Downloads
  const activeDownloads = useMemo(
    () => downloads.filter((d) => d.status !== 'completed'),
    [downloads]
  );

  const completedDownloads = useMemo(
    () => downloads.filter((d) => d.status === 'completed'),
    [downloads]
  );

  const filteredCompleted = useMemo(() => {
    return completedDownloads.filter((d) => {
      // Category Filter
      if (categoryFilter === 'video' && d.type !== 'video') return false;
      if (categoryFilter === 'audio' && d.type !== 'audio') return false;
      if (categoryFilter === 'other' && (d.type === 'video' || d.type === 'audio')) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return d.title.toLowerCase().includes(query) || d.url.toLowerCase().includes(query);
      }

      return true;
    });
  }, [completedDownloads, categoryFilter, searchQuery]);

  // Statistics
  const totalCompletedBytes = useMemo(() => {
    return completedDownloads.reduce((acc, item) => acc + (item.totalBytes || item.loadedBytes || 0), 0);
  }, [completedDownloads]);

  const activeCount = useMemo(
    () => downloads.filter((d) => d.status === 'downloading' || d.status === 'queued').length,
    [downloads]
  );

  const failedCount = useMemo(
    () => downloads.filter((d) => d.status === 'failed').length,
    [downloads]
  );

  // ── Handle Back / Close ──
  const handleBack = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [onClose, router]);

  // ── Add Download Handler ──
  const handleAddSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setInputError('Please enter a valid media or stream URL');
      return;
    }

    if (!isValidUrl(trimmed)) {
      setInputError('Please enter a valid HTTP or HTTPS URL');
      return;
    }

    setInputError('');
    let finalTitle = inputTitle.trim();
    if (!finalTitle) {
      const detected = detectPlatform(trimmed);
      if (detected?.platform) {
        finalTitle = `${detected.platform.name} Download ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        try {
          const u = new URL(trimmed);
          const pathEnd = u.pathname.split('/').filter(Boolean).pop();
          finalTitle = pathEnd || `Download_${Date.now()}`;
        } catch {
          finalTitle = `Download_${Date.now()}`;
        }
      }
    }

    await addDownload(trimmed, finalTitle, inputType);
    setInputUrl('');
    setInputTitle('');
    setShowAddModal(false);
    setActiveTab('downloading');
  };

  // ── Play Completed Media ──
  const handlePlayMedia = async (item: DownloadItem) => {
    setActiveMediaItem(item);
    const resolved = await getPlayableMediaUrl(item);
    setPlayableUrl(resolved);
    setIsPlayingMedia(true);
  };

  const handleClosePlayer = () => {
    setIsPlayingMedia(false);
    setActiveMediaItem(null);
    setPlayableUrl(null);
  };

  // ── Confirm and Delete File ──
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    await deleteDownloadedMediaFile(itemToDelete);
    cancelDownload(itemToDelete.id);
    setItemToDelete(null);
    if (activeMediaItem?.id === itemToDelete.id) {
      handleClosePlayer();
    }
  };

  // ── Share File Handler ──
  const handleShareMedia = async (item: DownloadItem) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: `Check out ${item.title} on Play Nexa`,
          url: item.filepath && !item.filepath.startsWith('blob:') ? item.filepath : item.url,
        });
      } else {
        navigator.clipboard.writeText(item.url);
      }
    } catch {
      // Share cancelled or unavailable
    }
  };

  return (
    <div
      id="smart-downloader-dashboard"
      className="flex min-h-screen w-full flex-col bg-[#0D0D0D] text-white selection:bg-[#7C3AED] selection:text-white"
    >
      {/* ── Top AMOLED Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-neutral-800/60 bg-[#0D0D0D]/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900/90 text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">Smart Downloader</h1>
              <span className="rounded-md bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                Pro
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              {activeCount > 0
                ? `${activeCount} active in queue`
                : `${completedDownloads.length} saved offline`}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Add URL Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowAddModal(true)}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] px-3 text-xs font-semibold text-white shadow-md shadow-[#7C3AED]/20 transition-all hover:brightness-110 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add URL</span>
          </motion.button>

          {/* Settings Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSettingsModal(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-[#161616] text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
            aria-label="Download Settings"
          >
            <Sliders className="h-4 w-4" />
          </motion.button>
        </div>
      </header>

      {/* ── Main Tab Navigation ───────────────────────────────────────────── */}
      <div className="border-b border-neutral-800/40 bg-[#121212] px-4 py-2">
        <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900/90 p-1">
          {/* Tab: Downloading */}
          <button
            onClick={() => setActiveTab('downloading')}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors duration-200 ${
              activeTab === 'downloading' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {activeTab === 'downloading' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 rounded-lg bg-[#1F1F2E] border border-[#7C3AED]/40 shadow-sm"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Zap
                className={`h-4 w-4 ${
                  activeTab === 'downloading' ? 'text-[#06B6D4]' : 'text-neutral-500'
                }`}
              />
              Downloading
              {activeDownloads.length > 0 && (
                <span
                  className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    activeCount > 0
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {activeDownloads.length}
                </span>
              )}
            </span>
          </button>

          {/* Tab: Completed */}
          <button
            onClick={() => setActiveTab('completed')}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors duration-200 ${
              activeTab === 'completed' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {activeTab === 'completed' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 rounded-lg bg-[#1F1F2E] border border-[#7C3AED]/40 shadow-sm"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <CheckCircle2
                className={`h-4 w-4 ${
                  activeTab === 'completed' ? 'text-[#10B981]' : 'text-neutral-500'
                }`}
              />
              Completed
              {completedDownloads.length > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-neutral-800 px-1 text-[10px] font-bold text-neutral-300">
                  {completedDownloads.length}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* ── Tab Content Container ─────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-4 pb-28">
        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: DOWNLOADING QUEUE
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'downloading' && (
          <div className="space-y-4">
            {/* Top Queue Controls Bar */}
            {activeDownloads.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800/60 bg-[#161616] p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-2.5 w-2.5">
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#06B6D4]">
                      {activeCount > 0 && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#06B6D4] opacity-75" />
                      )}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-neutral-300">
                    Queue: <strong className="text-white">{activeDownloads.length}</strong> items (Max{' '}
                    {maxConcurrent} concurrent)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {failedCount > 0 && (
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={retryAllFailed}
                      className="flex h-7 items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 text-[11px] font-medium text-amber-400 hover:bg-amber-500/20"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Retry ({failedCount})
                    </motion.button>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={resumeAll}
                    className="flex h-7 items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 text-[11px] font-medium text-neutral-300 hover:text-white"
                  >
                    <Play className="h-3 w-3" />
                    Resume All
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={pauseAll}
                    className="flex h-7 items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 text-[11px] font-medium text-neutral-300 hover:text-white"
                  >
                    <Pause className="h-3 w-3" />
                    Pause All
                  </motion.button>
                </div>
              </div>
            )}

            {/* List of Active Downloads */}
            {activeDownloads.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {activeDownloads.map((item) => {
                    const meta = getPlatformMeta(item.url, item.type);
                    const isDownloading = item.status === 'downloading';
                    const isPaused = item.status === 'paused';
                    const isQueued = item.status === 'queued';
                    const isFailed = item.status === 'failed';

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                        className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#161616] p-4 shadow-lg transition-all"
                      >
                        {/* Glow indicator on downloading */}
                        {isDownloading && (
                          <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[#7C3AED]/15 blur-2xl" />
                        )}

                        <div className="flex items-start justify-between gap-3">
                          {/* Platform Icon */}
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-lg shadow-inner">
                            {meta.iconText}
                          </div>

                          {/* Info Block */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neutral-300">
                                {item.type === 'audio' ? 'MP3 Audio' : 'MP4 Video'}
                              </span>
                              <span className="text-[10px] text-neutral-400">{meta.name}</span>
                            </div>

                            <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-white">
                              {item.title}
                            </h3>

                            {/* Progress bar */}
                            <div className="mt-2.5">
                              <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                                <motion.div
                                  className={`h-full rounded-full ${
                                    isFailed
                                      ? 'bg-red-500'
                                      : isPaused
                                      ? 'bg-amber-500'
                                      : isQueued
                                      ? 'bg-neutral-600'
                                      : 'bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#06B6D4] animate-pulse'
                                  }`}
                                  style={{
                                    width: `${Math.max(2, Math.min(100, item.progress))}%`,
                                  }}
                                  transition={{ duration: 0.3, ease: 'easeOut' }}
                                />
                              </div>
                            </div>

                            {/* Metric Badges */}
                            <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-neutral-400">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-semibold ${
                                    isDownloading
                                      ? 'text-[#06B6D4]'
                                      : isPaused
                                      ? 'text-amber-400'
                                      : isFailed
                                      ? 'text-red-400'
                                      : 'text-neutral-400'
                                  }`}
                                >
                                  {isDownloading
                                    ? `${item.progress.toFixed(1)}%`
                                    : isPaused
                                    ? 'Paused'
                                    : isQueued
                                    ? 'Waiting in Queue'
                                    : 'Failed'}
                                </span>

                                {isDownloading && (
                                  <>
                                    <span className="text-neutral-600">•</span>
                                    <span className="font-mono text-white">{item.speed}</span>
                                    <span className="text-neutral-600">•</span>
                                    <span className="flex items-center gap-0.5 text-neutral-300">
                                      <Clock className="h-3 w-3 text-neutral-400" />
                                      {item.eta}
                                    </span>
                                  </>
                                )}
                              </div>

                              <span className="text-neutral-400">{item.fileSize}</span>
                            </div>

                            {/* Error text if failed */}
                            {isFailed && item.error && (
                              <p className="mt-1 flex items-center gap-1 text-[11px] text-red-400">
                                <AlertCircle className="h-3 w-3" />
                                {item.error}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex shrink-0 items-center gap-1.5">
                            {/* Pause / Resume Button */}
                            {isDownloading && (
                              <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={() => pauseDownload(item.id)}
                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-800 text-amber-400 transition-colors hover:bg-neutral-700"
                                aria-label="Pause Download"
                              >
                                <Pause className="h-4 w-4" />
                              </motion.button>
                            )}

                            {(isPaused || isQueued) && (
                              <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={() => resumeDownload(item.id)}
                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED]/20 text-[#A78BFA] transition-colors hover:bg-[#7C3AED]/30"
                                aria-label="Resume Download"
                              >
                                <Play className="h-4 w-4 fill-current" />
                              </motion.button>
                            )}

                            {isFailed && (
                              <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={() => retryDownload(item.id)}
                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 transition-colors hover:bg-amber-500/30"
                                aria-label="Retry Download"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </motion.button>
                            )}

                            {/* Cancel / Delete Button */}
                            <motion.button
                              whileTap={{ scale: 0.88 }}
                              onClick={() => cancelDownload(item.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                              aria-label="Cancel Download"
                            >
                              <X className="h-4 w-4" />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              /* Empty State for Downloading Tab */
              <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-800/60 bg-[#161616] p-8 text-center shadow-lg">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-2xl text-[#7C3AED] shadow-inner ring-1 ring-neutral-800">
                  ⚡
                </div>
                <h2 className="mt-4 text-base font-bold text-white">No Active Downloads</h2>
                <p className="mt-1 max-w-xs text-xs text-neutral-400">
                  Paste any video or audio URL below to start downloading with Smart Downloader Pro.
                </p>

                {/* Instant Inline URL Paste Box */}
                <div className="mt-6 w-full max-w-md">
                  <div className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900/90 p-1.5 focus-within:border-[#7C3AED]">
                    <input
                      type="url"
                      placeholder="Paste YouTube, TikTok, or MP4/MP3 URL..."
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="flex-1 bg-transparent px-3 text-xs text-white placeholder-neutral-500 outline-none"
                    />
                    <button
                      onClick={() => handleAddSubmit()}
                      className="flex h-9 items-center gap-1 rounded-lg bg-[#7C3AED] px-3.5 text-xs font-semibold text-white transition-transform active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => router.push('/download')}
                    className="flex items-center gap-1 text-xs text-[#06B6D4] hover:underline"
                  >
                    <span>Browse 20+ supported platforms</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: COMPLETED DOWNLOADS (OFFLINE MEDIA HUB)
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            {/* Storage & Action Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800/60 bg-[#161616] p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xs font-medium text-neutral-400">Offline Storage Used</h2>
                  <p className="text-sm font-bold text-white">
                    {(totalCompletedBytes / (1024 * 1024)).toFixed(1)} MB{' '}
                    <span className="text-xs font-normal text-neutral-400">
                      ({completedDownloads.length} files)
                    </span>
                  </p>
                </div>
              </div>

              {completedDownloads.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setShowClearConfirm(true)}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All
                </motion.button>
              )}
            </div>

            {/* Filter Pills & Search */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search downloaded files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-xl border border-neutral-800 bg-[#141414] pl-9 pr-4 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                {(
                  [
                    { id: 'all', label: 'All Files', icon: FileText },
                    { id: 'video', label: 'Movies & Videos', icon: Film },
                    { id: 'audio', label: 'Music & Audio', icon: Music },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const count =
                    tab.id === 'all'
                      ? completedDownloads.length
                      : completedDownloads.filter((d) => d.type === tab.id).length;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setCategoryFilter(tab.id)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        categoryFilter === tab.id
                          ? 'bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/20'
                          : 'border border-neutral-800 bg-[#161616] text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                      <span className="rounded-full bg-black/30 px-1 text-[10px]">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Completed Items List */}
            {filteredCompleted.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredCompleted.map((item) => {
                    const meta = getPlatformMeta(item.url, item.type);
                    const isAudio = item.type === 'audio';

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group flex flex-col justify-between gap-3 rounded-2xl border border-neutral-800/80 bg-[#161616] p-4 shadow-md transition-all hover:border-neutral-700 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Artwork Thumbnail / Icon */}
                          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 shadow-inner">
                            <span className="text-2xl">{isAudio ? '🎵' : '🎬'}</span>
                            <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[8px] font-bold uppercase text-white">
                              {isAudio ? 'MP3' : 'MP4'}
                            </span>
                          </div>

                          {/* Media Details */}
                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-1 text-sm font-semibold text-white group-hover:text-purple-200">
                              {item.title}
                            </h3>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                              <span className="font-medium text-emerald-400">{item.fileSize}</span>
                              <span>•</span>
                              <span>{meta.name}</span>
                              {item.completedAt && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {new Date(item.completedAt).toLocaleDateString([], {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 border-t border-neutral-800/60 pt-3 sm:border-0 sm:pt-0">
                          {/* Play Button */}
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handlePlayMedia(item)}
                            className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] px-4 text-xs font-semibold text-white shadow-md shadow-[#7C3AED]/20 transition-all hover:brightness-110"
                          >
                            <Play className="h-4 w-4 fill-current" />
                            <span>Play</span>
                          </motion.button>

                          {/* Share Button */}
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleShareMedia(item)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition-colors hover:text-white"
                            aria-label="Share File"
                          >
                            <Share2 className="h-4 w-4" />
                          </motion.button>

                          {/* Delete Button */}
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => setItemToDelete(item)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                            aria-label="Delete File"
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              /* Empty State for Completed Tab */
              <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-800/60 bg-[#161616] p-8 text-center shadow-lg">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-2xl text-[#10B981] shadow-inner ring-1 ring-neutral-800">
                  📁
                </div>
                <h2 className="mt-4 text-base font-bold text-white">No Completed Files Yet</h2>
                <p className="mt-1 max-w-xs text-xs text-neutral-400">
                  Files you download will appear here for high-speed offline local playback.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-5 flex items-center gap-1.5 rounded-xl bg-[#7C3AED] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#7C3AED]/20 transition-all hover:brightness-110 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Start a Download
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          POPUP MODAL: ADD DOWNLOAD URL
         ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-[#161616] p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED]/20 text-[#A78BFA]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">Add New Download</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg p-1 text-neutral-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-neutral-300">Media URL *</label>
                  <input
                    type="url"
                    placeholder="https://... (video, audio, direct file)"
                    value={inputUrl}
                    onChange={(e) => {
                      setInputUrl(e.target.value);
                      if (inputError) setInputError('');
                    }}
                    required
                    className="mt-1 h-11 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#7C3AED]"
                  />
                  {inputError && <p className="mt-1 text-[11px] text-red-400">{inputError}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300">
                    File Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. My Favorite Song or Movie"
                    value={inputTitle}
                    onChange={(e) => setInputTitle(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300">Download Format</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInputType('video')}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                        inputType === 'video'
                          ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white shadow-sm'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Film className="h-4 w-4 text-[#A78BFA]" />
                      <span>Video (MP4)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInputType('audio')}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                        inputType === 'audio'
                          ? 'border-emerald-500 bg-emerald-500/20 text-white shadow-sm'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Music className="h-4 w-4 text-emerald-400" />
                      <span>Audio (MP3)</span>
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 rounded-xl border border-neutral-700 bg-neutral-800 py-2.5 text-xs font-semibold text-neutral-300 transition-colors hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#7C3AED]/30 transition-all hover:brightness-110"
                  >
                    Start Download
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          POPUP MODAL: SETTINGS & CONCURRENT QUEUE
         ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-800 bg-[#161616] p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <h3 className="text-base font-bold text-white">Queue Settings</h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="rounded-lg p-1 text-neutral-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-300">Max Concurrent Downloads</span>
                    <span className="font-bold text-[#06B6D4]">{maxConcurrent} tasks</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    step={1}
                    value={maxConcurrent}
                    onChange={(e) => setMaxConcurrent(parseInt(e.target.value, 10))}
                    className="mt-2 w-full accent-[#7C3AED]"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500">
                    <span>1 (Eco)</span>
                    <span>3 (Default)</span>
                    <span>6 (Turbo)</span>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-3 text-xs text-neutral-400 space-y-1.5">
                  <p>
                    <strong className="text-white">Smart Engine:</strong> Transfers automatically
                    save to public Documents/PlayNexa on Android, and IndexedDB on Web.
                  </p>
                </div>

                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full rounded-xl bg-[#7C3AED] py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:brightness-110"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          CONFIRMATION DIALOG: DELETE ITEM / CLEAR ALL
         ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {(itemToDelete || showClearConfirm) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-[#161616] p-5 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {showClearConfirm ? 'Clear All Completed?' : 'Delete Downloaded File?'}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {showClearConfirm
                      ? 'This will delete all completed offline files.'
                      : itemToDelete?.title}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => {
                    setItemToDelete(null);
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 rounded-xl border border-neutral-700 bg-neutral-800 py-2 text-xs font-medium text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showClearConfirm) {
                      clearCompleted();
                      setShowClearConfirm(false);
                    } else {
                      handleConfirmDelete();
                    }
                  }}
                  className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-semibold text-white shadow-md shadow-red-600/30 hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          FULL-SCREEN LOCAL MEDIA PLAYER MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isPlayingMedia && activeMediaItem && playableUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white backdrop-blur-md"
          >
            {/* Player Header */}
            <div className="flex h-14 items-center justify-between border-b border-neutral-800 px-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={handleClosePlayer}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-neutral-300 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <h2 className="line-clamp-1 text-sm font-bold text-white">
                    {activeMediaItem.title}
                  </h2>
                  <span className="text-[10px] text-neutral-400">
                    Offline Local Player • {activeMediaItem.fileSize}
                  </span>
                </div>
              </div>

              <button
                onClick={handleClosePlayer}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video or Audio Stage */}
            <div className="flex flex-1 items-center justify-center p-4">
              {activeMediaItem.type === 'audio' ? (
                <div className="flex w-full max-w-md flex-col items-center rounded-3xl border border-neutral-800 bg-[#161616] p-8 text-center shadow-2xl">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] text-5xl shadow-xl shadow-purple-500/20">
                    🎵
                  </div>
                  <h3 className="mt-6 text-base font-bold text-white">{activeMediaItem.title}</h3>
                  <p className="mt-1 text-xs text-neutral-400">High Quality Local Audio Stream</p>

                  <audio controls autoPlay src={playableUrl} className="mt-6 w-full accent-[#7C3AED]" />
                </div>
              ) : (
                <div className="relative flex max-h-full w-full max-w-4xl flex-col items-center justify-center overflow-hidden rounded-2xl bg-black shadow-2xl">
                  <video
                    controls
                    autoPlay
                    playsInline
                    src={playableUrl}
                    className="max-h-[75vh] w-full rounded-2xl object-contain"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
