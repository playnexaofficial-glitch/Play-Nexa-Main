'use client'
import { Sun, Volume2, VolumeX, FastForward, Rewind } from 'lucide-react'

interface GestureHint {
  type: 'brightness' | 'volume' | 'seek' | null
  value: number
  direction?: 'left' | 'right'
  side: 'left' | 'right'
}

interface VideoGesturesProps {
  hint: GestureHint
}

export default function VideoGestures({ hint }: VideoGesturesProps) {
  if (!hint.type) return null

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none transition-all duration-200 ${
        hint.side === 'left' ? 'left-6' : 'right-6'
      }`}
      id="video-gestures-hint"
    >
      <div className="bg-neutral-950/95 border border-neutral-800 rounded-2xl px-4 py-3.5 min-w-[100px] flex flex-col items-center justify-center">
        {hint.type === 'brightness' && (
          <>
            <Sun size={20} className="text-amber-400 mb-2" />
            <span className="text-white text-2xs uppercase tracking-wider font-semibold mb-1.5">
              Brightness
            </span>
            <div className="w-16 h-1 bg-neutral-800 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-white rounded-full" style={{ width: `${hint.value}%` }} />
            </div>
            <span className="text-neutral-400 text-3xs font-mono">{hint.value}%</span>
          </>
        )}

        {hint.type === 'volume' && (
          <>
            {hint.value === 0 ? (
              <VolumeX size={20} className="text-neutral-400 mb-2" />
            ) : (
              <Volume2 size={20} className="text-[#7C3AED] mb-2" />
            )}
            <span className="text-white text-2xs uppercase tracking-wider font-semibold mb-1.5">
              Volume
            </span>
            <div className="w-16 h-1 bg-neutral-800 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-white rounded-full" style={{ width: `${hint.value}%` }} />
            </div>
            <span className="text-neutral-400 text-3xs font-mono">{hint.value}%</span>
          </>
        )}

        {hint.type === 'seek' && (
          <>
            {hint.value > 0 ? (
              <FastForward size={22} className="text-[#A78BFA] mb-1.5" />
            ) : (
              <Rewind size={22} className="text-[#A78BFA] mb-1.5" />
            )}
            <span className="text-white text-xs font-mono font-bold">
              {hint.value > 0 ? `+${hint.value}s` : `${hint.value}s`}
            </span>
            <span className="text-neutral-400 text-3xs font-medium uppercase tracking-wider">
              Seek
            </span>
          </>
        )}
      </div>
    </div>
  )
}
