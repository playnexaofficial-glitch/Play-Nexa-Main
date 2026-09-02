'use client'
import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Gauge,
  Music2,
  Sun,
  Repeat,
} from 'lucide-react'
import type { useVideoPlayer } from '@/hooks/useVideoPlayer'

type Player = ReturnType<typeof useVideoPlayer>

const ASPECT_LABELS = {
  contain: 'Fit',
  cover: 'Crop',
  fill: 'Fill',
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

interface VideoBottomControlsProps {
  player: Player
}

export default function VideoBottomControls({ player }: VideoBottomControlsProps) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 transition-all duration-300"
      style={{
        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.98) 0%, rgba(0, 0, 0, 0.8) 60%, transparent 100%)',
      }}
      id="video-bottom-controls"
    >
      <div style={{ padding: '48px 20px 24px' }}>
        {/* Seekbar & Timestamps */}
        <div className="mb-4">
          <div className="relative h-1 bg-white/20 rounded-full flex items-center">
            <div
              className="absolute h-full bg-[#7C3AED] rounded-full pointer-events-none transition-[width] duration-300 ease-out"
              style={{ width: `${player.progress}%` }}
            />
            <div
              className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-lg pointer-events-none transition-[left] duration-300 ease-out"
              style={{
                left: `${player.progress}%`,
                transform: 'translate(-50%, 0)',
              }}
            />
            <input
              type="range"
              min={0}
              max={player.duration || 100}
              value={player.currentTime}
              step={0.5}
              onChange={e => player.seek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              style={{ height: '100%' }}
              id="video-progress-slider"
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-400 font-mono mt-2 select-none">
            <span>{player.formatTime(player.currentTime)}</span>
            <span>{player.formatTime(player.duration)}</span>
          </div>
        </div>

        {/* Playback Row Controls */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={player.prev}
            disabled={player.files.length <= 1}
            className="w-11 h-11 flex items-center justify-center active:opacity-60 transition-opacity duration-150 text-white disabled:opacity-30 cursor-pointer"
            id="video-ctrl-prev"
          >
            <SkipBack size={24} />
          </button>

          <button
            onClick={() => player.skipBy(-10)}
            className="w-11 h-11 flex items-center justify-center active:opacity-60 transition-opacity duration-150 text-white cursor-pointer"
            id="video-ctrl-skip-back"
          >
            <div className="relative flex items-center justify-center">
              <SkipBack size={20} />
              <span className="absolute text-[8px] font-bold text-white mt-0.5 select-none font-mono">10</span>
            </div>
          </button>

          <button
            onClick={player.toggle}
            className="w-16 h-16 rounded-full bg-[#7C3AED] active:opacity-80 transition-opacity duration-150 flex items-center justify-center cursor-pointer"
            id="video-ctrl-play-pause"
          >
            {player.isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : player.isPlaying ? (
              <Pause size={28} className="text-white fill-white" />
            ) : (
              <Play size={28} className="text-white fill-white ml-0.5" />
            )}
          </button>

          <button
            onClick={() => player.skipBy(10)}
            className="w-11 h-11 flex items-center justify-center active:opacity-60 transition-opacity duration-150 text-white cursor-pointer"
            id="video-ctrl-skip-forward"
          >
            <div className="relative flex items-center justify-center">
              <SkipForward size={20} />
              <span className="absolute text-[8px] font-bold text-white mt-0.5 select-none font-mono">10</span>
            </div>
          </button>

          <button
            onClick={player.next}
            disabled={player.files.length <= 1}
            className="w-11 h-11 flex items-center justify-center active:opacity-60 transition-opacity duration-150 text-white disabled:opacity-30 cursor-pointer"
            id="video-ctrl-next"
          >
            <SkipForward size={24} />
          </button>
        </div>

        {/* Tools row */}
        <div className="flex items-center justify-around border-t border-neutral-800/60 pt-4 px-2 select-none">
          {/* Mute controller toggle */}
          <button
            onClick={() => player.setVolume(player.volume > 0 ? 0 : 1)}
            className="flex flex-col items-center gap-1.5 active:opacity-60 cursor-pointer"
            id="video-tool-volume"
          >
            {player.volume === 0 ? (
              <VolumeX size={18} className="text-neutral-500" />
            ) : (
              <Volume2 size={18} className="text-white" />
            )}
            <span className="text-neutral-400 text-[10px] font-medium font-mono">
              {Math.round(player.volume * 100)}%
            </span>
          </button>

          {/* Aspect cycler */}
          <button
            onClick={player.cycleAspect}
            className="flex flex-col items-center gap-1.5 active:opacity-60 cursor-pointer"
            id="video-tool-aspect"
          >
            <Maximize size={18} className="text-white" />
            <span className="text-neutral-400 text-[10px] font-semibold">
              {ASPECT_LABELS[player.aspectRatio]}
            </span>
          </button>

          {/* Speed multiplier cycler */}
          <button
            onClick={() => {
              const idx = SPEEDS.indexOf(player.playbackRate)
              const nextSpeed = SPEEDS[(idx + 1) % SPEEDS.length]
              player.setPlaybackRate(nextSpeed)
            }}
            className="flex flex-col items-center gap-1.5 active:opacity-60 cursor-pointer"
            id="video-tool-speed"
          >
            <Gauge
              size={18}
              className={player.playbackRate !== 1 ? 'text-[#A78BFA]' : 'text-white'}
            />
            <span
              className={`text-[10px] font-mono font-bold ${
                player.playbackRate !== 1 ? 'text-[#A78BFA]' : 'text-neutral-400'
              }`}
            >
              {player.playbackRate}x
            </span>
          </button>

          {/* Loop playback controller */}
          <button
            onClick={() => player.setIsLoop(!player.isLoop)}
            className="flex flex-col items-center gap-1.5 active:opacity-60 cursor-pointer"
            id="video-tool-loop"
          >
            <Repeat
              size={18}
              className={player.isLoop ? 'text-[#A78BFA]' : 'text-white'}
            />
            <span
              className={`text-[10px] font-semibold ${
                player.isLoop ? 'text-[#A78BFA]' : 'text-neutral-400'
              }`}
            >
              Loop
            </span>
          </button>

          {/* Audio mode background-only selector */}
          <button
            onClick={player.toggleAudioMode}
            className="flex flex-col items-center gap-1.5 active:opacity-60 cursor-pointer"
            id="video-tool-audio"
          >
            <Music2
              size={18}
              className={player.isAudioMode ? 'text-[#A78BFA]' : 'text-white'}
            />
            <span
              className={`text-[10px] font-semibold ${
                player.isAudioMode ? 'text-[#A78BFA]' : 'text-neutral-400'
              }`}
            >
              Audio
            </span>
          </button>

          {/* Brightness status overlay */}
          <div className="flex flex-col items-center gap-1.5 select-none" id="video-tool-brightness">
            <Sun size={18} className="text-white" />
            <span className="text-neutral-400 text-[10px] font-medium font-mono">
              {Math.round(player.brightness * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
