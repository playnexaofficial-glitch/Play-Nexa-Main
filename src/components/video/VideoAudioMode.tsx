'use client'
import { Music2 } from 'lucide-react'
import type { useVideoPlayer } from '@/hooks/useVideoPlayer'

type Player = ReturnType<typeof useVideoPlayer>

interface VideoAudioModeProps {
  player: Player
}

export default function VideoAudioMode({ player }: VideoAudioModeProps) {
  if (!player.isAudioMode) return null

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#070B14] pointer-events-none select-none px-6"
      id="video-audio-mode-screen"
    >
      <div className="w-32 h-32 rounded-full bg-[#141424] border border-[#2D2D44] flex items-center justify-center mb-6 relative">
        <div className="absolute inset-2 rounded-full border border-[#7C3AED]/20 animate-ping opacity-15" />
        <Music2 size={48} className="text-[#7C3AED] stroke-[1.5]" />
      </div>

      <p className="text-white font-bold text-lg text-center leading-tight mb-2 max-w-md" id="audio-mode-track-title">
        {player.currentFile?.displayName || 'Audio Track'}
      </p>

      <div className="flex items-center gap-2" id="audio-mode-meta">
        <span className="text-neutral-400 text-xs uppercase font-mono font-bold tracking-wide">
          Audio Mode
        </span>
        <span className="text-neutral-600">•</span>
        <span className="text-neutral-400 text-xs font-mono">
          {player.formatSize(player.currentFile?.size || 0)}
        </span>
      </div>
    </div>
  )
}
