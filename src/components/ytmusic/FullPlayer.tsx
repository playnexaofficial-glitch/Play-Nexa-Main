'use client'
import { useState, useEffect } from 'react'
import { ArrowLeft, Shuffle, SkipBack,
  Pause, Play, SkipForward, Repeat, Music, Heart } from
  'lucide-react'
import { type MusicTrack } from
  '@/context/MusicContext'

type ViewMode = 'audio' | 'video'

interface Props {
  track: MusicTrack
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  isPlaying: boolean
  currentTime: number; duration: number
  progress: number; shuffleMode: boolean
  repeatMode: 'none'|'one'|'all'
  currentIndex: number; queueLength: number
  onTogglePlay: () => void
  onNext: () => void; onPrev: () => void
  onToggleShuffle: () => void
  onToggleRepeat: () => void
  onSeek: (t: number) => void
  onClose: () => void
  formatTime: (s: number) => string
  userId: string | null
  allTracks: MusicTrack[]
}

export default function FullPlayer({
  track, iframeRef, isPlaying, currentTime,
  duration, progress, shuffleMode, repeatMode,
  currentIndex, queueLength, onTogglePlay,
  onNext, onPrev, onToggleShuffle, onToggleRepeat,
  onSeek, onClose, formatTime, userId, allTracks
}: Props) {
  const [viewMode, setViewMode] =
    useState<ViewMode>('audio')
  const [videoIframeKey, setVideoIframeKey] =
    useState(0)
  const [liked, setLiked] = useState(false)

  const handleLike = async () => {
    if (!userId) return
    const next = !liked
    setLiked(next) // Optimistic
    try {
      const res = await fetch(
        '/api/ytmusic/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          trackId: track.id,
          youtubeId: track.youtube_id,
          action: next ? 'like' : 'unlike',
        }),
      })
      const data = await res.json()
      if (data.liked !== undefined) {
        setLiked(data.liked)
      }
    } catch {
      setLiked(!next) // Revert on error
    }
  }

  // Load liked state
  // (run on mount and track change)
  useEffect(() => {
    const loadLiked = async () => {
      if (!userId) return
      try {
        const res = await fetch(
          `/api/ytmusic/like?userId=${userId}` +
          `&trackId=${track.id}`)
        const data = await res.json()
        setLiked(!!data.liked)
      } catch {}
    }
    loadLiked()
  }, [userId, track.id])

  const seekTo = (seconds: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [seconds, true],
      }), '*'
    )
    onSeek(seconds)
  }

  const currentProgress = duration > 0
    ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
    : progress

  return (
    <div className="fixed inset-0 z-[99999]
      bg-[#0B0B1E] flex flex-col">

      {/* Video mode: dedicated visible iframe */}
      {viewMode === 'video' && track && (
        <div style={{
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: '#000000',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <iframe
            key={`video-${track.youtube_id}-${videoIframeKey}`}
            src={
              `https://www.youtube.com/embed/` +
              `${track.youtube_id}` +
              `?autoplay=1` +
              `&controls=1` +
              `&playsinline=1` +
              `&rel=0` +
              `&modestbranding=1`
            }
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title={track.title}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center
        justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onClose}
          className="w-10 h-10 flex items-center
            justify-center active:opacity-60">
          <ArrowLeft size={22} color="#FFFFFF"/>
        </button>
        <div className="text-center">
          <p className="text-[#9CA3AF] text-xs">
            Now Playing
          </p>
          <p className="text-[#9CA3AF] text-[10px]">
            {currentIndex + 1} of {queueLength}
          </p>
        </div>
        {/* Audio/Video toggle — no emojis */}
        <div className="flex bg-[#1A1A2E]
          rounded-full p-0.5">
          <button
            onClick={() => {
              setViewMode('audio')
              setVideoIframeKey(k => k + 1)
            }}
            className={`px-3 py-1.5 rounded-full
              text-xs font-medium min-h-[30px]
              capitalize transition-colors
              duration-150 active:opacity-60
              ${viewMode === 'audio'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#9CA3AF]'}`}>
            Audio
          </button>
          <button
            onClick={() => {
              setViewMode('video')
              if (isPlaying) {
                onTogglePlay()
              } else {
                iframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({
                    event: 'command',
                    func: 'pauseVideo',
                    args: [],
                  }), '*'
                )
              }
            }}
            className={`px-3 py-1.5 rounded-full
              text-xs font-medium min-h-[30px]
              capitalize transition-colors
              duration-150 active:opacity-60
              ${viewMode === 'video'
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#9CA3AF]'}`}>
            Video
          </button>
        </div>
      </div>

      {/* Album Art (Audio mode) */}
      {viewMode === 'audio' && (
        <div className="flex-1 flex flex-col
          items-center justify-center px-8">
          <div className="relative mb-8">
            <div style={{
              width: 240,
              height: 240,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid #2D2D44',
              animation: isPlaying
                ? 'pn-spin-slow 12s linear infinite'
                : 'none',
              transition: 'opacity 150ms',
            }}>
              {track?.thumbnail ? (
                <img
                  src={track.thumbnail}
                  alt={track?.title || ''}
                  loading="lazy"
                  width={240}
                  height={240}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#1A1A2E]">
                  <Music size={64} color="#6B7280" />
                </div>
              )}
            </div>
          </div>
          <p className="text-white font-bold
            text-xl text-center mb-1 line-clamp-2
            leading-tight">
            {track.title}
          </p>
          <p className="text-[#9CA3AF] text-sm mb-4">
            {track.channel_name}
          </p>

          {/* Action Row: Like */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className="px-4 py-2 rounded-full
                border active:scale-95
                transition-all duration-150 flex items-center gap-1.5"
              style={{
                borderColor: liked
                  ? '#7C3AED' : '#2D2D44',
                backgroundColor: liked
                  ? 'rgba(124,58,237,0.15)' : '#1A1A2E',
              }}>
              <Heart
                size={14}
                className={liked ? 'text-[#A78BFA] fill-[#A78BFA]' : 'text-[#9CA3AF]'}
              />
              <span className="text-xs font-semibold"
                style={{
                  color: liked ? '#A78BFA' : '#9CA3AF'
                }}>
                {liked ? 'Liked' : 'Like'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Video mode info & actions */}
      {viewMode === 'video' && (
        <div className="flex-1 flex flex-col
          justify-end px-4 pb-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold
                text-base mb-0.5 line-clamp-1">
                {track.title}
              </p>
              <p className="text-[#9CA3AF] text-sm">
                {track.channel_name}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Seekbar — raised for visibility */}
      <div style={{
        padding: '0 24px',
        marginBottom: 16,
      }}>
        <div style={{
          position: 'relative',
          height: 24,
          display: 'flex',
          alignItems: 'center',
          marginBottom: 4,
        }}>
          {/* Background */}
          <div style={{
            position: 'absolute',
            left: 0, right: 0,
            height: 4,
            backgroundColor: '#2D2D44',
            borderRadius: 999,
          }} />
          {/* Fill */}
          <div style={{
            position: 'absolute',
            left: 0,
            height: 4,
            backgroundColor: '#7C3AED',
            borderRadius: 999,
            width: `${currentProgress}%`,
            pointerEvents: 'none',
            transition: 'width 0.15s linear',
          }} />
          {/* Thumb */}
          <div style={{
            position: 'absolute',
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            left: `${currentProgress}%`,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }} />
          {/* Invisible range on top */}
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 100}
            value={currentTime}
            step={0.5}
            onChange={e =>
              seekTo(parseFloat(e.target.value))}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              zIndex: 3,
              margin: 0,
            }}
          />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span style={{
            color: '#6B7280',
            fontSize: 11,
            fontFamily: 'system-ui, sans-serif',
          }}>
            {formatTime(currentTime)}
          </span>
          <span style={{
            color: '#6B7280',
            fontSize: 11,
            fontFamily: 'system-ui, sans-serif',
          }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center
        justify-center gap-6 px-6 pb-24 md:pb-10
        flex-shrink-0">
        <button onClick={onToggleShuffle}
          className="w-10 h-10 flex items-center
            justify-center active:opacity-60">
          <Shuffle size={20}
            color={shuffleMode
              ? '#7C3AED' : '#9CA3AF'}/>
        </button>
        <button onClick={onPrev}
          className="w-10 h-10 flex items-center
            justify-center active:opacity-60">
          <SkipBack size={26} color="#FFFFFF"/>
        </button>
        <button onClick={onTogglePlay}
          className="w-16 h-16 rounded-full
            flex items-center justify-center
            active:opacity-60 cursor-pointer"
          style={{ backgroundColor: '#7C3AED' }}>
          {isPlaying
            ? <Pause size={26} color="#FFFFFF"
                fill="#FFFFFF"/>
            : <Play size={26} color="#FFFFFF"
                fill="#FFFFFF"/>}
        </button>
        <button onClick={onNext}
          className="w-10 h-10 flex items-center
            justify-center active:opacity-60">
          <SkipForward size={26} color="#FFFFFF"/>
        </button>
        <button onClick={onToggleRepeat}
          className="w-10 h-10 flex items-center
            justify-center active:opacity-60
            relative">
          <Repeat size={20}
            color={repeatMode !== 'none'
              ? '#7C3AED' : '#9CA3AF'}/>
          {repeatMode === 'one' && (
            <span className="absolute -top-0.5
              -right-0.5 text-[9px] font-bold
              text-[#7C3AED]">1</span>
          )}
        </button>
      </div>
    </div>
  )
}
