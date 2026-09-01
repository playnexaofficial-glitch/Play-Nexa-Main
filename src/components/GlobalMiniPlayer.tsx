'use client'
import { useMusicContext } from '@/context/MusicContext'
import { usePathname, useRouter } from 'next/navigation'
import { Play, Pause, SkipForward, X } from 'lucide-react'

export default function GlobalMiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    progress,
    togglePlay,
    nextTrack,
    showMiniPlayer,
    setShowMiniPlayer,
  } = useMusicContext()

  const pathname = usePathname()
  const router = useRouter()

  // Hide on certain pages
  const hideOn = ['/admin', '/auth', '/video-player', '/video', '/music']
  const shouldHide = hideOn.some(p => pathname.startsWith(p))

  const isVisible = !!currentTrack && showMiniPlayer && !shouldHide && pathname !== '/ytmusic'

  if (!isVisible || !currentTrack) return null

  return (
    <div
      key="global-mini-player"
      className="fixed left-0 right-0 z-50 bg-[#121220] border-t border-[#2D2D44] transition-all duration-300 ease-out"
      style={{ bottom: '64px' }}
    >
      {/* Top Progress bar */}
      <div className="h-1 bg-[#232338] w-full">
        <div
          className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] transition-all duration-300 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-3.5 h-16">
        {/* Thumbnail & Title clickable to open Music */}
        <div
          onClick={() => router.push('/ytmusic')}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer active:opacity-60 transition-opacity duration-150"
        >
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            loading="lazy"
            width={42}
            height={42}
            className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-[#2D2D44]"
          />
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate leading-tight">
              {currentTrack.title}
            </p>
            <p className="text-[#9CA3AF] text-[11px] truncate mt-0.5">
              {currentTrack.channel_name}
            </p>
          </div>
        </div>

        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-[#7C3AED] flex items-center justify-center active:opacity-60 transition-opacity duration-150 flex-shrink-0"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={17} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <Play size={17} color="#FFFFFF" fill="#FFFFFF" className="ml-0.5" />
          )}
        </button>

        {/* Next Track Button */}
        <button
          type="button"
          onClick={nextTrack}
          className="w-9 h-9 rounded-full bg-[#1F1F33] flex items-center justify-center active:opacity-60 transition-opacity duration-150 flex-shrink-0 text-white"
          aria-label="Next track"
        >
          <SkipForward size={16} color="#FFFFFF" />
        </button>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => setShowMiniPlayer(false)}
          className="w-8 h-8 rounded-full text-[#9CA3AF] flex items-center justify-center active:opacity-60 transition-opacity duration-150 flex-shrink-0"
          aria-label="Dismiss mini player"
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

