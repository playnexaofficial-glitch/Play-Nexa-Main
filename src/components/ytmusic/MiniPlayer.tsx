'use client'
import { useEffect } from 'react'
import { Pause, Play, SkipForward } from 'lucide-react'

interface Props {
  track: { title:string; thumbnail:string
    channel_name:string }
  isPlaying: boolean; progress: number
  onTogglePlay: () => void
  onNext: () => void
  onExpand: () => void
  iframeRef?: React.RefObject<HTMLIFrameElement | null>
  isVideoMode?: boolean
}
export default function MiniPlayer({
  track, isPlaying, progress,
  onTogglePlay, onNext, onExpand,
  iframeRef, isVideoMode
}: Props) {
  // Cleanup: move iframe back to body on unmount
  useEffect(() => {
    return () => {
      if (iframeRef?.current) {
        const iframe = iframeRef.current
        document.body.appendChild(iframe)
        Object.assign(iframe.style, {
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: '0',
          pointerEvents: 'none',
        })
      }
    }
  }, [iframeRef])

  return (
    <div
      className="fixed bottom-20 left-0 right-0 z-50 bg-[#141420] border-t border-[#2D2D44] shadow-2xl transition-all duration-300 ease-out"
    >
      {/* Progress line */}
      <div className="h-0.5 bg-[#2D2D44]">
        <div className="h-full bg-[#7C3AED]"
          style={{ width: `${progress}%` }}/>
      </div>
      <div
        onClick={onExpand}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            onExpand()
          }
        }}
        className="w-full flex items-center gap-3 px-4 h-16 active:bg-[#1A1A2E] cursor-pointer select-none">
        {isVideoMode && iframeRef?.current && (
          <div
            style={{
              width: 80,
              height: 45,
              flexShrink: 0,
              backgroundColor: '#000',
              borderRadius: 8,
              overflow: 'hidden',
              position: 'relative',
            }}
            ref={(el) => {
              if (el && iframeRef?.current) {
                const iframe = iframeRef.current
                Object.assign(iframe.style, {
                  position: 'absolute',
                  top: '0', left: '0',
                  width: '100%', height: '100%',
                  opacity: '1',
                  pointerEvents: 'none',
                })
                el.appendChild(iframe)
              }
            }}
          />
        )}
        {(!isVideoMode || !iframeRef?.current) && (
          <img
            src={track.thumbnail}
            alt={track.title}
            loading="lazy"
            width={44}
            height={44}
            className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-white text-sm font-medium truncate">{track.title}</p>
          <p className="text-[#9CA3AF] text-xs truncate">{track.channel_name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onTogglePlay()
            }}
            className="w-10 h-10 flex items-center justify-center active:opacity-60 cursor-pointer"
            aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying
              ? <Pause size={20} color="#FFFFFF"/>
              : <Play size={20} color="#FFFFFF"/>}
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onNext()
            }}
            className="w-10 h-10 flex items-center justify-center active:opacity-60 cursor-pointer"
            aria-label="Next">
            <SkipForward size={20} color="#FFFFFF"/>
          </button>
        </div>
      </div>
    </div>
  )
}

