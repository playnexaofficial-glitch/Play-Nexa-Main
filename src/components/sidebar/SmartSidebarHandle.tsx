'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Zap, ChevronLeft } from 'lucide-react';
import { useSmartSidebarStore } from '@/store/useSmartSidebarStore';
import { useDownloadStore } from '@/store/useDownloadStore';

export default function SmartSidebarHandle() {
  const isEnabled = useSmartSidebarStore((s) => s.isEnabled);
  const isOpen = useSmartSidebarStore((s) => s.isOpen);
  const toggleIsOpen = useSmartSidebarStore((s) => s.toggleIsOpen);
  const setIsOpen = useSmartSidebarStore((s) => s.setIsOpen);
  const handleYPercent = useSmartSidebarStore((s) => s.handleYPercent);
  const setHandleYPercent = useSmartSidebarStore((s) => s.setHandleYPercent);

  const downloads = useDownloadStore((s) => s.downloads);

  // Active downloads count
  const activeDownloads = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'queued'
  );
  const hasActiveDownloads = activeDownloads.length > 0;

  // Touch / Pointer gesture state for swipe-left & vertical dragging
  const [isDraggingY, setIsDraggingY] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startPercentRef = useRef(handleYPercent);
  const isHorizontalSwipeRef = useRef(false);
  const isVerticalDragRef = useRef(false);
  const hasMovedRef = useRef(false);

  // Keep state updated
  useEffect(() => {
    startPercentRef.current = handleYPercent;
  }, [handleYPercent]);

  // Pointer Down (Mouse or Touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startPercentRef.current = handleYPercent;
    isHorizontalSwipeRef.current = false;
    isVerticalDragRef.current = false;
    hasMovedRef.current = false;

    // Capture pointer
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  // Pointer Move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const deltaX = e.clientX - startXRef.current;
      const deltaY = e.clientY - startYRef.current;

      if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
        hasMovedRef.current = true;
      }

      // Determine gesture direction if not decided
      if (!isHorizontalSwipeRef.current && !isVerticalDragRef.current) {
        if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -8) {
          isHorizontalSwipeRef.current = true;
        } else if (Math.abs(deltaY) > 10) {
          isVerticalDragRef.current = true;
          setIsDraggingY(true);
        }
      }

      // Handle Vertical Dragging along edge
      if (isVerticalDragRef.current) {
        const screenHeight = window.innerHeight || 800;
        const newY = startYRef.current + deltaY;
        const newPercent = (newY / screenHeight) * 100;
        setHandleYPercent(newPercent);
      }

      // Handle Horizontal Swipe Left to Open
      if (isHorizontalSwipeRef.current && deltaX < -25) {
        setIsOpen(true);
      }
    },
    [handleYPercent, setHandleYPercent, setIsOpen]
  );

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDraggingY(false);

    // Release pointer capture
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}

    // If it was a clean tap without significant drag, toggle sidebar
    if (!hasMovedRef.current) {
      toggleIsOpen();
    }
  };

  if (!isEnabled || isOpen) return null;

  return (
    <div
      style={{
        top: `${handleYPercent}%`,
        transform: 'translateY(-50%)',
      }}
      className="fixed right-0 z-[99990] flex items-center select-none touch-none"
    >
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`group relative flex items-center cursor-pointer transition-all duration-200 ${
          isDraggingY ? 'scale-105' : 'hover:scale-[1.03] active:scale-95'
        }`}
        title="Realme Smart Sidebar (Swipe left to open)"
      >
        {/* Floating Handle: Thin, semi-transparent frosted vertical bar */}
        <div
          className={`relative flex flex-col items-center justify-center rounded-l-2xl border-l border-t border-b backdrop-blur-md transition-all duration-300 shadow-xl ${
            hasActiveDownloads
              ? 'w-6 h-20 bg-purple-950/80 border-purple-500/50 shadow-purple-950/60'
              : 'w-4.5 h-16 bg-white/12 hover:bg-white/20 border-white/20 hover:border-white/40 shadow-black/40'
          }`}
          style={{
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          {/* Inner Realme Frosted Pill Indicator */}
          <div
            className={`w-1 rounded-full transition-all duration-300 ${
              hasActiveDownloads
                ? 'h-10 bg-gradient-to-b from-purple-300 to-cyan-300 shadow-[0_0_8px_#c084fc]'
                : 'h-8 bg-white/70 group-hover:bg-white'
            }`}
          />

          {/* Active Download Badge Indicator */}
          {hasActiveDownloads && (
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <span className="relative flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-6 w-6 bg-gradient-to-tr from-purple-600 to-indigo-500 text-white text-[10px] font-extrabold items-center justify-center shadow-lg border border-white/30">
                  {activeDownloads.length}
                </span>
              </span>
            </div>
          )}

          {/* Subtle Swipe Left Hint on hover */}
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-white/70">
            <ChevronLeft className="w-3.5 h-3.5 animate-pulse" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
