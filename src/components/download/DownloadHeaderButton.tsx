'use client';

import { useRouter } from 'next/navigation';
import { Download, ArrowDownToLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDownloadStore } from '@/store/useDownloadStore';

interface DownloadHeaderButtonProps {
  className?: string;
  variant?: 'circle' | 'topbar';
  onClick?: () => void;
}

export default function DownloadHeaderButton({
  className = '',
  variant = 'circle',
  onClick,
}: DownloadHeaderButtonProps) {
  const router = useRouter();
  const downloads = useDownloadStore((state) => state.downloads);

  // Active downloads count (downloading or queued)
  const activeCount = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'queued'
  ).length;

  const isDownloading = downloads.some((d) => d.status === 'downloading');

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push('/downloads');
    }
  };

  if (variant === 'topbar') {
    return (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleClick}
        className={`relative flex h-10 w-10 items-center justify-center text-pn-muted transition-colors duration-150 hover:text-white ${className}`}
        aria-label={`Downloads (${activeCount} active)`}
        type="button"
      >
        {isDownloading ? (
          <motion.div
            animate={{ y: [0, 2, 0] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          >
            <ArrowDownToLine className="h-5 w-5 text-[#06B6D4]" />
          </motion.div>
        ) : (
          <Download className="h-5 w-5" />
        )}

        <AnimatePresence>
          {activeCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-pink-600 px-1 text-[10px] font-bold text-white shadow-md shadow-red-500/40 ring-1 ring-[#0D0D0D]"
            >
              {activeCount > 9 ? '9+' : activeCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  // Circle button matching main header style (Search & Settings)
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={handleClick}
      className={`relative h-11 w-11 rounded-full bg-[#1A1A2E] border border-neutral-800/60 flex items-center justify-center transition-all duration-200 hover:border-neutral-700 active:opacity-75 shadow-lg shadow-black/40 ${className}`}
      aria-label={`Downloads (${activeCount} active)`}
      type="button"
    >
      {isDownloading ? (
        <motion.div
          animate={{ y: [0, 2, 0] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        >
          <ArrowDownToLine className="h-5 w-5 text-[#06B6D4]" />
        </motion.div>
      ) : (
        <Download className="h-5 w-5 text-white" />
      )}

      <AnimatePresence>
        {activeCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.4 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-pink-500 px-1.5 text-[11px] font-bold text-white shadow-lg shadow-red-500/50 ring-2 ring-[#0D0D0D]"
          >
            {activeCount > 9 ? '9+' : activeCount}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
