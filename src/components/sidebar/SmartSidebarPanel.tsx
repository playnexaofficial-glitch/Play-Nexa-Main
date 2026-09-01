'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  X,
  Layers,
  Download,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  ExternalLink,
  ChevronRight,
  GripHorizontal,
  Sparkles,
  Link2,
  Film,
  Music,
  HardDrive,
  Settings,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sliders,
  Shield,
} from 'lucide-react';
import { useSmartSidebarStore } from '@/store/useSmartSidebarStore';
import { useDownloadStore, type DownloadItem } from '@/store/useDownloadStore';
import { detectPlatform, isValidUrl } from '@/lib/urlDetector';
import { toast } from 'sonner';

export default function SmartSidebarPanel() {
  const router = useRouter();
  const isOpen = useSmartSidebarStore((s) => s.isOpen);
  const setIsOpen = useSmartSidebarStore((s) => s.setIsOpen);
  const isEnabled = useSmartSidebarStore((s) => s.isEnabled);
  const setIsEnabled = useSmartSidebarStore((s) => s.setIsEnabled);
  const panelHeight = useSmartSidebarStore((s) => s.panelHeight);
  const setPanelHeight = useSmartSidebarStore((s) => s.setPanelHeight);
  const overlayPermissionGranted = useSmartSidebarStore(
    (s) => s.overlayPermissionGranted
  );

  const {
    downloads,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
    pauseAll,
    resumeAll,
    clearCompleted,
    addDownload,
  } = useDownloadStore();

  // Quick URL Input state
  const [quickUrl, setQuickUrl] = useState('');
  const [quickType, setQuickType] = useState<'video' | 'audio'>('video');
  const [isAddingQuick, setIsAddingQuick] = useState(false);
  const [activeTab, setActiveTab] = useState<'downloads' | 'tools'>('downloads');

  // Top Edge Resizing Logic
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(panelHeight);

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartYRef.current = e.clientY;
    resizeStartHeightRef.current = panelHeight;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing) return;
      // Dragging upward increases height, dragging downward decreases height
      const deltaY = resizeStartYRef.current - e.clientY;
      const newHeight = resizeStartHeightRef.current + deltaY;
      setPanelHeight(newHeight);
    },
    [isResizing, setPanelHeight]
  );

  const handleResizePointerUp = (e: React.PointerEvent) => {
    setIsResizing(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  // Filter active and recently completed downloads
  const activeDownloads = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'queued' || d.status === 'paused'
  );
  const completedDownloads = downloads.filter((d) => d.status === 'completed');
  const totalCount = downloads.length;

  const handleQuickDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;

    if (!isValidUrl(quickUrl)) {
      toast.error('Please enter a valid media URL');
      return;
    }

    setIsAddingQuick(true);
    try {
      const detected = detectPlatform(quickUrl);
      const title = detected?.platform?.name
        ? `${detected.platform.name} Media (${new Date().toLocaleTimeString()})`
        : `Media Download (${new Date().toLocaleTimeString()})`;

      await addDownload(quickUrl.trim(), title, quickType);
      setQuickUrl('');
      toast.success('Download queued in background!');
    } catch (err) {
      toast.error('Failed to queue download');
    } finally {
      setIsAddingQuick(false);
    }
  };

  const navigateTo = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99995] pointer-events-none flex justify-end items-center">
          {/* Backdrop for closing */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
          />

          {/* Realme 7 Smart Sidebar Floating Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              height: `${panelHeight}px`,
              maxHeight: '88vh',
              minHeight: '320px',
            }}
            className="relative pointer-events-auto w-[330px] sm:w-[360px] mr-2 sm:mr-4 bg-[#0F0F16]/95 backdrop-blur-2xl border border-[#2B2B3F] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white z-10 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Resize Drag Handle Bar (Drag up/down to adjust height dynamically) */}
            <div
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              onPointerCancel={handleResizePointerUp}
              className={`w-full py-1.5 flex items-center justify-center cursor-ns-resize touch-none border-b border-white/5 transition-colors ${
                isResizing ? 'bg-purple-900/40' : 'hover:bg-white/5'
              }`}
              title="Drag up or down to resize sidebar"
            >
              <div className="flex items-center gap-1">
                <div
                  className={`w-12 h-1.5 rounded-full transition-all ${
                    isResizing ? 'bg-purple-400 w-16' : 'bg-white/30'
                  }`}
                />
              </div>
            </div>

            {/* Sidebar Header: Realme 7 ColorOS Header */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#232336] bg-[#141420]/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 flex items-center justify-center shadow-md shadow-purple-950/50">
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white tracking-tight">
                      Smart Sidebar
                    </span>
                    <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                      Realme UI
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center active:scale-95 transition-transform"
                  title="Close Sidebar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs (Active Downloads / Quick Tools) */}
            <div className="px-3 pt-2 pb-1.5 flex gap-1.5 bg-[#0C0C12] border-b border-[#202030]">
              <button
                type="button"
                onClick={() => setActiveTab('downloads')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'downloads'
                    ? 'bg-purple-600/25 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Downloads</span>
                {activeDownloads.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500 text-white font-extrabold">
                    {activeDownloads.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tools')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'tools'
                    ? 'bg-purple-600/25 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Quick Tools</span>
              </button>
            </div>

            {/* Main Panel Content Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-neutral-800">
              {activeTab === 'downloads' && (
                <>
                  {/* Downloads Quick Summary & Actions */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-semibold text-neutral-400">
                      Active Queue ({activeDownloads.length})
                    </span>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      {activeDownloads.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={pauseAll}
                            className="px-2 py-0.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium active:scale-95 transition-all"
                          >
                            Pause All
                          </button>
                          <button
                            type="button"
                            onClick={resumeAll}
                            className="px-2 py-0.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 font-medium active:scale-95 transition-all"
                          >
                            Resume
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Active Downloads List */}
                  {activeDownloads.length === 0 ? (
                    <div className="py-6 px-4 rounded-2xl bg-[#141420]/60 border border-[#232338] text-center flex flex-col items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-purple-950/40 border border-purple-800/40 flex items-center justify-center text-purple-400 mb-2">
                        <Download className="w-5 h-5 opacity-70" />
                      </div>
                      <p className="text-xs font-semibold text-neutral-300">
                        No active downloads
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5 max-w-[200px]">
                        Videos and songs you download will show live progress here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeDownloads.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-[#151522] border border-[#282840] shadow-sm space-y-2 transition-all hover:border-purple-500/40"
                        >
                          {/* Title & Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span
                                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                                    item.type === 'audio'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  }`}
                                >
                                  {item.type}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  {item.status.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-white truncate leading-snug">
                                {item.title}
                              </p>
                            </div>

                            {/* Item Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {item.status === 'downloading' ? (
                                <button
                                  type="button"
                                  onClick={() => pauseDownload(item.id)}
                                  className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center active:scale-95 transition-all"
                                  title="Pause"
                                >
                                  <Pause className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => resumeDownload(item.id)}
                                  className="w-7 h-7 rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center active:scale-95 transition-all"
                                  title="Resume"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => cancelDownload(item.id)}
                                className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 flex items-center justify-center active:scale-95 transition-all"
                                title="Cancel"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400 rounded-full"
                                initial={false}
                                animate={{ width: `${item.progress}%` }}
                                transition={{ duration: 0.2 }}
                              />
                            </div>
                            {/* Stats */}
                            <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                              <span className="text-purple-300 font-bold">
                                {item.progress.toFixed(0)}%
                              </span>
                              <span>{item.speed || '0 KB/s'}</span>
                              <span>ETA: {item.eta || '--'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Completed mini list if any */}
                  {completedDownloads.length > 0 && (
                    <div className="pt-2 border-t border-[#232338]">
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-[11px] font-semibold text-neutral-400">
                          Completed ({completedDownloads.length})
                        </span>
                        <button
                          type="button"
                          onClick={clearCompleted}
                          className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {completedDownloads.slice(0, 2).map((c) => (
                          <div
                            key={c.id}
                            className="p-2 rounded-xl bg-[#12121c] border border-[#1f1f2e] flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              <span className="text-neutral-300 truncate text-[11px]">
                                {c.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-neutral-500 font-mono flex-shrink-0">
                              {c.fileSize}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Downloads Manager CTA */}
                  <button
                    type="button"
                    onClick={() => navigateTo('/downloads')}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 hover:from-purple-900/60 hover:to-indigo-900/60 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center justify-between transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-purple-400" />
                      <span>Full Downloads Manager</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400" />
                  </button>
                </>
              )}

              {activeTab === 'tools' && (
                <div className="space-y-3">
                  {/* Quick URL Downloader Box */}
                  <div className="p-3 rounded-2xl bg-[#141422] border border-[#25253a] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-purple-400" />
                        Quick Link Downloader
                      </span>
                      <div className="flex bg-neutral-900 rounded-lg p-0.5 border border-neutral-800">
                        <button
                          type="button"
                          onClick={() => setQuickType('video')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            quickType === 'video'
                              ? 'bg-purple-600 text-white'
                              : 'text-neutral-400'
                          }`}
                        >
                          Video
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickType('audio')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            quickType === 'audio'
                              ? 'bg-purple-600 text-white'
                              : 'text-neutral-400'
                          }`}
                        >
                          Audio
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleQuickDownload} className="flex gap-1.5">
                      <input
                        type="url"
                        value={quickUrl}
                        onChange={(e) => setQuickUrl(e.target.value)}
                        placeholder="Paste link to download..."
                        className="flex-1 min-w-0 bg-[#0c0c14] border border-[#232336] rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="submit"
                        disabled={isAddingQuick || !quickUrl.trim()}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl active:scale-95 disabled:opacity-40 transition-all flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Get</span>
                      </button>
                    </form>
                  </div>

                  {/* App Quick Navigation Shortcuts */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-neutral-400 px-1">
                      Play Nexa Fast Tools
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => navigateTo('/ytmusic')}
                        className="p-2.5 rounded-xl bg-[#141420] border border-[#222234] hover:border-purple-500/40 text-left flex items-center gap-2.5 active:scale-95 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                          <Music className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">YT Music</p>
                          <p className="text-[10px] text-neutral-400">Stream tracks</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigateTo('/movies')}
                        className="p-2.5 rounded-xl bg-[#141420] border border-[#222234] hover:border-purple-500/40 text-left flex items-center gap-2.5 active:scale-95 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                          <Film className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Movies Hub</p>
                          <p className="text-[10px] text-neutral-400">Bangla & OTT</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigateTo('/video')}
                        className="p-2.5 rounded-xl bg-[#141420] border border-[#222234] hover:border-purple-500/40 text-left flex items-center gap-2.5 active:scale-95 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Local Video</p>
                          <p className="text-[10px] text-neutral-400">Hardware Player</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigateTo('/settings')}
                        className="p-2.5 rounded-xl bg-[#141420] border border-[#222234] hover:border-purple-500/40 text-left flex items-center gap-2.5 active:scale-95 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Settings className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Settings</p>
                          <p className="text-[10px] text-neutral-400">Preferences</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Panel Footer: Realme Toggle & Permission Status */}
            <div className="p-3 bg-[#0B0B10] border-t border-[#202030] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-300">
                  Floating Handle
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    overlayPermissionGranted
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-purple-500/20 text-purple-300'
                  }`}
                >
                  {overlayPermissionGranted ? 'Overlay OK' : 'In-App'}
                </span>
              </div>

              {/* Master Feature Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
