'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Sparkles,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  X,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { requestOverlayPermission } from '@/lib/overlayPermission';
import { useSmartSidebarStore } from '@/store/useSmartSidebarStore';
import { Capacitor } from '@capacitor/core';

interface SystemOverlayDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SystemOverlayDialog({
  isOpen,
  onClose,
}: SystemOverlayDialogProps) {
  const setOverlayPermissionGranted = useSmartSidebarStore(
    (s) => s.setOverlayPermissionGranted
  );
  const setHasSeenPermissionDialog = useSmartSidebarStore(
    (s) => s.setHasSeenPermissionDialog
  );

  const isAndroid =
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  const handleGrant = async () => {
    setHasSeenPermissionDialog(true);
    if (isAndroid) {
      await requestOverlayPermission();
      setOverlayPermissionGranted(true);
    } else {
      setOverlayPermissionGranted(true);
    }
    onClose();
  };

  const handleDismiss = () => {
    setHasSeenPermissionDialog(true);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md bg-[#0F0F14] border border-[#2D2D44] rounded-3xl p-6 shadow-2xl overflow-hidden z-10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header with Close */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-900/40">
                  <div className="w-full h-full bg-[#0F0F14] rounded-[14px] flex items-center justify-center text-purple-400">
                    <Layers className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                      Realme 7 Feature
                    </span>
                    <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 text-[10px] font-semibold rounded-md border border-purple-500/30">
                      Smart Sidebar
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    Draw Over Other Apps
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-8 h-8 rounded-full bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Phone Mockup */}
            <div className="relative my-2 p-3.5 rounded-2xl bg-[#151520] border border-[#232338] flex items-center gap-3 overflow-hidden">
              <div className="relative w-16 h-20 rounded-lg bg-[#09090D] border border-neutral-700 flex items-center justify-end p-0.5 overflow-hidden flex-shrink-0">
                {/* Floating Handle Demonstration */}
                <div className="w-1.5 h-7 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7] animate-pulse" />
                <div className="absolute top-1 left-1.5 text-[7px] text-neutral-500 font-mono">
                  Realme UI
                </div>
                <div className="absolute bottom-1.5 left-1.5 text-[6px] text-cyan-400 font-mono flex items-center gap-0.5">
                  <Zap className="w-2 h-2" />
                  Active
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-200 leading-snug">
                  Floating Sidebar Access
                </p>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Swipe in from the right edge to view active download speeds, pause/resume, and launch tools anywhere.
                </p>
              </div>
            </div>

            {/* Permission Benefits & Steps */}
            <div className="space-y-2.5 my-3">
              <div className="flex items-start gap-2.5 text-xs text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Real-time Progress:</strong> Monitor download speeds and file completion over any screen.
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Non-Intrusive Handle:</strong> Ultra-thin edge bar with drag-to-resize panel controls.
                </span>
              </div>
              {isAndroid ? (
                <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-200">
                  <p className="font-semibold text-purple-300 mb-0.5 flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    Android System Step:
                  </p>
                  Toggle &quot;Allow display over other apps&quot; for Play Nexa in system settings.
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-[11px] text-neutral-400">
                  Running in Web/PWA mode: Floating sidebar operates smoothly within Play Nexa.
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-3 pt-3 border-t border-[#232338] flex flex-col gap-2">
              <button
                type="button"
                onClick={handleGrant}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAndroid ? 'Open Settings & Enable' : 'Enable Smart Sidebar'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-2.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
              >
                Continue in In-App Mode
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
