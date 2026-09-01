'use client'
import { ChevronDown, Maximize, Minimize } from 'lucide-react'
import type { useVideoPlayer } from '@/hooks/useVideoPlayer'

type Player = ReturnType<typeof useVideoPlayer>

interface VideoTopBarProps {
  player: Player
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onBack: () => void
}

export default function VideoTopBar({
  player,
  isFullscreen,
  onToggleFullscreen,
  onBack,
}: VideoTopBarProps) {
  return (
    <div
      className="absolute top-0 left-0 right-0 z-20 transition-all duration-300"
      style={{
        background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.4) 60%, transparent 100%)',
      }}
      id="video-top-bar"
    >
      <div className="flex items-center gap-4 px-5 pt-4 pb-12">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black/40 border border-neutral-800 flex items-center justify-center active:opacity-60 transition-opacity duration-150 cursor-pointer"
          id="video-top-back"
        >
          <ChevronDown size={22} color="#FFFFFF" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate tracking-wide" id="video-top-title">
            {player.currentFile?.displayName || 'Video'}
          </p>
          {player.files.length > 1 && (
            <p className="text-neutral-400 text-xs font-mono mt-0.5" id="video-top-counter">
              {player.currentIndex + 1} / {player.files.length}
            </p>
          )}
        </div>

        <button
          onClick={onToggleFullscreen}
          className="w-10 h-10 rounded-full bg-black/40 border border-neutral-800 flex items-center justify-center active:opacity-60 transition-opacity duration-150 cursor-pointer"
          id="video-top-fullscreen"
        >
          {isFullscreen ? <Minimize size={18} color="#FFFFFF" /> : <Maximize size={18} color="#FFFFFF" />}
        </button>
      </div>
    </div>
  )
}
