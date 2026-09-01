'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import type { useVideoPlayer } from '@/hooks/useVideoPlayer'
import VideoTopBar from './VideoTopBar'
import VideoBottomControls from './VideoBottomControls'
import VideoLockOverlay from './VideoLockOverlay'
import VideoAudioMode from './VideoAudioMode'
import VideoGestures from './VideoGestures'

type Player = ReturnType<typeof useVideoPlayer>

interface GestureHint {
  type: 'brightness' | 'volume' | 'seek' | null
  value: number
  direction?: 'left' | 'right'
  side: 'left' | 'right'
}

interface VideoPlayerScreenProps {
  player: Player
  onBack: () => void
}

const MIN_SWIPE_Y = 25
const MIN_SWIPE_RATIO = 2.5

export default function VideoPlayerScreen({ player, onBack }: VideoPlayerScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [gestureHint, setGestureHint] = useState<GestureHint>({
    type: null,
    value: 0,
    side: 'left',
  })
  const [lockToast, setLockToast] = useState(false)

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const touchStartVolume = useRef(1)
  const touchStartBrightness = useRef(1)
  const isDragging = useRef(false)
  const lastTapTime = useRef(0)
  const lastTapSide = useRef<'left' | 'right' | 'center'>('center')

  const controlsTimer = useRef<NodeJS.Timeout | null>(null)
  const gestureTimer = useRef<NodeJS.Timeout | null>(null)

  // Auto-hide controls timer
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)

    if (!player.isLocked) {
      controlsTimer.current = setTimeout(() => {
        setShowControls(false)
      }, 4000)
    }
  }, [player.isLocked])

  useEffect(() => {
    resetControlsTimer()
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current)
    }
  }, [resetControlsTimer])

  // Hold controls visible if video is paused
  useEffect(() => {
    if (!player.isPlaying) {
      if (controlsTimer.current) clearTimeout(controlsTimer.current)
      setShowControls(true)
    } else {
      resetControlsTimer()
    }
  }, [player.isPlaying, resetControlsTimer])

  // Sync fullscreen change events
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = async () => {
    const el = containerRef.current
    if (!el) return
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen?.()
      } else {
        await document.exitFullscreen?.()
      }
    } catch {}
  }

  const showGesture = useCallback((hint: GestureHint, ms = 800) => {
    setGestureHint(hint)
    if (gestureTimer.current) clearTimeout(gestureTimer.current)
    gestureTimer.current = setTimeout(() => {
      setGestureHint({ type: null, value: 0, side: 'left' })
    }, ms)
  }, [])

  // Viewport Touch Interactions
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (player.isLocked) return
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      touchStartTime.current = Date.now()
      touchStartVolume.current = player.volume
      touchStartBrightness.current = player.brightness
      isDragging.current = false
    },
    [player.isLocked, player.volume, player.brightness]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (player.isLocked) return

      const dy = touchStartY.current - e.touches[0].clientY
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current)
      const absDy = Math.abs(dy)

      // STRICT check: must be clearly vertical AND past minimum threshold
      if (absDy < MIN_SWIPE_Y) return
      if (dx > 0 && absDy / dx < MIN_SWIPE_RATIO) return

      // Now it's a real vertical swipe
      isDragging.current = true

      const W = window.innerWidth
      const xPos = touchStartX.current
      const zone = xPos < W * 0.4 ? 'left' : xPos > W * 0.6 ? 'right' : 'center'

      if (zone === 'left') {
        // Brightness — smaller delta for control
        const delta = dy / 300
        const newB = Math.max(0.1, Math.min(1.0, touchStartBrightness.current + delta))
        player.setBrightness(newB)
        showGesture({
          type: 'brightness',
          value: Math.round(newB * 100),
          side: 'left',
        })
      } else if (zone === 'right') {
        // Volume — smaller delta for control
        const delta = dy / 300
        const newV = Math.max(0, Math.min(1, touchStartVolume.current + delta))
        player.setVolume(newV)
        showGesture({
          type: 'volume',
          value: Math.round(newV * 100),
          side: 'right',
        })
      }
    },
    [player, showGesture]
  )

  const onTouchEnd = useCallback(
    () => {
      if (player.isLocked) {
        setLockToast(true)
        setTimeout(() => setLockToast(false), 1500)
        return
      }

      const wasDragging = isDragging.current
      isDragging.current = false

      if (wasDragging) {
        // Reset start values after drag
        touchStartBrightness.current = player.brightness
        touchStartVolume.current = player.volume
        return
      }

      // Check elapsed time
      const elapsed = Date.now() - touchStartTime.current
      if (elapsed > 500) return // Long press, skip

      const W = window.innerWidth
      const x = touchStartX.current
      const zone: 'left' | 'center' | 'right' =
        x < W * 0.35 ? 'left' : x > W * 0.65 ? 'right' : 'center'

      const now = Date.now()
      const timeSince = now - lastTapTime.current
      const sameSide = lastTapSide.current === zone

      if (timeSince < 300 && sameSide) {
        // Double Tap
        lastTapTime.current = 0
        if (zone === 'left') {
          player.skipBy(-10)
          showGesture(
            {
              type: 'seek',
              value: -10,
              direction: 'left',
              side: 'left',
            },
            700
          )
        } else if (zone === 'right') {
          player.skipBy(10)
          showGesture(
            {
              type: 'seek',
              value: 10,
              direction: 'right',
              side: 'right',
            },
            700
          )
        } else {
          player.toggle()
        }
      } else {
        // Single Tap
        lastTapTime.current = now
        lastTapSide.current = zone
        if (zone === 'center') {
          setShowControls(v => !v)
        } else {
          resetControlsTimer()
        }
      }
    },
    [player, showGesture, resetControlsTimer]
  )

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current)
      if (gestureTimer.current) clearTimeout(gestureTimer.current)
    }
  }, [])

  // Global keyboard shortcuts (Space for play/pause, Left/Right arrows for seek)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hijacking input fields if any exist
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return
      }

      if (player.isLocked) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          player.toggle()
          resetControlsTimer()
          break
        case 'ArrowLeft':
          e.preventDefault()
          player.skipBy(-10)
          resetControlsTimer()
          showGesture(
            {
              type: 'seek',
              value: -10,
              direction: 'left',
              side: 'left',
            },
            700
          )
          break
        case 'ArrowRight':
          e.preventDefault()
          player.skipBy(10)
          resetControlsTimer()
          showGesture(
            {
              type: 'seek',
              value: 10,
              direction: 'right',
              side: 'right',
            },
            700
          )
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [player, resetControlsTimer, showGesture])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black select-none overflow-hidden font-sans"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      id="video-player-viewport"
    >
      {/* Video stream direct JSX element */}
      <video
        ref={player.videoRef}
        src={player.currentFile?.objectUrl || undefined}
        className="absolute inset-0 w-full h-full"
        style={{
          objectFit: player.aspectRatio,
          opacity: player.isAudioMode ? 0 : 1,
          filter: `brightness(${player.brightness})`,
          backgroundColor: '#000',
          display: 'block',
        }}
        playsInline
        webkit-playsinline=""
        onTimeUpdate={e => {
          player.setCurrentTime(e.currentTarget.currentTime)
        }}
        onDurationChange={e => {
          const dur = e.currentTarget.duration
          if (isFinite(dur) && dur > 0) {
            player.setDuration(dur)
          }
        }}
        onLoadedMetadata={e => {
          const dur = e.currentTarget.duration
          if (isFinite(dur) && dur > 0) {
            player.setDuration(dur)
          }
        }}
        onPlaying={() => {
          player.setIsPlaying(true)
          player.setIsLoading(false)
          player.setError('')
        }}
        onPause={() => {
          player.setIsPlaying(false)
        }}
        onWaiting={() => {
          player.setIsLoading(true)
        }}
        onCanPlay={() => {
          player.setIsLoading(false)
        }}
        onEnded={() => {
          player.setIsPlaying(false)
          player.next()
        }}
        onError={e => {
          const video = e.currentTarget
          const code = video.error?.code
          const msg = video.error?.message || ''
          console.error('[Video] Error:', code, msg, video.src)

          let errMsg = 'Cannot play this video'
          if (code === 4 || msg.includes('not supported')) {
            errMsg =
              'Format not supported. This browser supports MP4 (H.264), WebM, and OGG. Try a different video file.'
          } else if (code === 3) {
            errMsg = 'Video file is corrupted or incomplete.'
          } else if (code === 2) {
            errMsg = 'Network error loading video.'
          } else if (code === 1) {
            errMsg = 'Video loading was stopped.'
          }

          player.setError(errMsg)
          player.setIsPlaying(false)
          player.setIsLoading(false)
        }}
      />

      {/* Audio-only Mode interface */}
      <VideoAudioMode player={player} />

      {/* Loading Spin indicator */}
      {player.isLoading && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          id="video-loader-overlay"
        >
          <div className="w-14 h-14 rounded-full border-[3px] border-white/10 border-t-white animate-spin" />
        </div>
      )}

      {/* Playback Error Warning */}
      {player.error && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 px-6 select-none"
          id="video-error-overlay"
        >
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl">
            <p className="text-white font-bold text-base mb-2">Playback Failed</p>
            <p className="text-neutral-400 text-xs leading-relaxed mb-4">{player.error}</p>
            <button
              onClick={onBack}
              className="w-full h-10 bg-[#7C3AED] rounded-xl text-white text-xs font-semibold active:opacity-80 transition-all duration-100 cursor-pointer"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Gestures Feedback HUD */}
      <VideoGestures hint={gestureHint} />

      {/* Screen Lock Toggle and Toast warning */}
      <VideoLockOverlay
        isLocked={player.isLocked}
        lockToast={lockToast}
        showControls={showControls}
        onToggleLock={() => {
          player.setIsLocked(true)
          setShowControls(false)
          setLockToast(true)
          setTimeout(() => setLockToast(false), 2000)
        }}
        onUnlock={() => {
          player.setIsLocked(false)
          setShowControls(true)
          setLockToast(false)
          resetControlsTimer()
        }}
      />

      {/* Header Navigation Controls */}
      {showControls && !player.isLocked && (
        <VideoTopBar
          player={player}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onBack={onBack}
        />
      )}

      {/* Footer Playback and Timeline Seek controllers */}
      {showControls && !player.isLocked && <VideoBottomControls player={player} />}

      {/* Safe tap target to bring controls back if hidden */}
      {!showControls && !player.isLocked && (
        <button
          className="absolute inset-0 z-10 w-full h-full bg-transparent border-0 cursor-pointer"
          onClick={resetControlsTimer}
          aria-label="Show controls"
          id="video-tap-recall-controls"
        />
      )}
    </div>
  )
}
