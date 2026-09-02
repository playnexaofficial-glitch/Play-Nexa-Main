'use client';

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import MediaDownloadSheet, {
  type MediaDownloadItem,
} from './MediaDownloadSheet';

interface MediaDownloadButtonProps {
  media: MediaDownloadItem;
  variant?: 'pill' | 'grid' | 'icon' | 'custom';
  className?: string;
  label?: string;
}

export default function MediaDownloadButton({
  media,
  variant = 'pill',
  className = '',
  label = 'Download',
}: MediaDownloadButtonProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleOpenSheet = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSheetOpen(true);
  };

  return (
    <>
      {variant === 'pill' && (
        <button
          type="button"
          onClick={handleOpenSheet}
          className={`flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1A2E] hover:bg-[#25253D] border border-[#2D2D44] text-white active:scale-95 transition-all text-xs font-semibold shrink-0 cursor-pointer shadow-sm ${className}`}
          title="Download Media"
        >
          <Download size={15} className="text-purple-400" />
          <span>{label}</span>
        </button>
      )}

      {variant === 'grid' && (
        <button
          type="button"
          onClick={handleOpenSheet}
          className={`flex flex-col items-center gap-1 min-h-[44px] justify-center active:scale-95 transition-all cursor-pointer ${className}`}
          title="Download Media"
        >
          <div className="w-8 h-8 rounded-full bg-[#1A1A2E] border border-[#2D2D44] flex items-center justify-center text-purple-400">
            <Download size={16} />
          </div>
          <span className="text-xs text-[#9CA3AF] font-medium">{label}</span>
        </button>
      )}

      {variant === 'icon' && (
        <button
          type="button"
          onClick={handleOpenSheet}
          className={`w-9 h-9 rounded-full bg-[#1A1A2E] hover:bg-[#25253D] border border-[#2D2D44] flex items-center justify-center text-neutral-300 hover:text-white active:scale-95 transition-all cursor-pointer ${className}`}
          title="Download"
        >
          <Download size={15} className="text-purple-400" />
        </button>
      )}

      {variant === 'custom' && (
        <button
          type="button"
          onClick={handleOpenSheet}
          className={`cursor-pointer active:scale-95 transition-transform ${className}`}
        >
          <Download size={16} />
          {label && <span>{label}</span>}
        </button>
      )}

      {/* Format Selector Bottom Sheet */}
      <MediaDownloadSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        media={media}
      />
    </>
  );
}
