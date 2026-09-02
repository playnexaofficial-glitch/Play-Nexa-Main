'use client'
import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { broadcastStop, onStopRequest } from '@/lib/audioCoordinator'

export interface MusicTrack {
  id: string
  youtube_id: string
  title: string
  thumbnail: string
  channel_name: string
  channel_id: string
}

interface MusicContextType {
  currentTrack: MusicTrack | null
  queue: MusicTrack[]
  currentIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  progress: number
  shuffleMode: boolean
  repeatMode: 'none' | 'one' | 'all'
  playbackRate: number
  setPlaybackRate: (rate: number) => void
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  playTrack: (track: MusicTrack, allTracks: MusicTrack[]) => void
  playTrackAt: (index: number) => void
  addToQueue: (track: MusicTrack) => void
  removeFromQueue: (index: number) => void
  reorderQueue: (startIndex: number, endIndex: number) => void
  clearQueue: () => void
  togglePlay: () => void
  nextTrack: () => void
  prevTrack: () => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  seek: (time: number) => void
  formatTime: (s: number) => string
  showMiniPlayer: boolean
  setShowMiniPlayer: (v: boolean) => void
}

const MusicContext = createContext<MusicContextType | null>(null)

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null)
  const [queue, setQueue] = useState<MusicTrack[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [shuffleMode, setShuffleMode] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none')
  const [playbackRate, setPlaybackRateState] = useState<number>(1)
  const [showMiniPlayer, setShowMiniPlayer] = useState(false)

  useEffect(() => {
    const cleanup = onStopRequest(
      'ytmusic',
      () => {
        // Another source started — pause
        if (iframeRef.current) {
          iframeRef.current
            .contentWindow?.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'pauseVideo',
              args: []
            }), '*'
          )
        }
        setIsPlaying(false)
      }
    )
    return cleanup
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const post = useCallback((data: any) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(data), '*')
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate)
    post({ event: 'command', func: 'setPlaybackRate', args: [rate] })
    try {
      localStorage.setItem('pn_music_playback_rate', rate.toString())
    } catch {}
  }, [post])

  // Restore saved playback rate on mount
  useEffect(() => {
    try {
      const savedRate = localStorage.getItem('pn_music_playback_rate')
      if (savedRate) {
        const rate = parseFloat(savedRate)
        if (!isNaN(rate) && rate > 0) {
          setPlaybackRateState(rate)
        }
      }
    } catch {}
  }, [])

  const seek = useCallback((time: number) => {
    setCurrentTime(time)
    post({ event: 'command', func: 'seekTo', args: [time, true] })
  }, [post])

  const nextTrack = useCallback(() => {
    if (!queue.length) return
    let next: number
    if (shuffleMode) {
      next = Math.floor(Math.random() * queue.length)
    } else {
      next = currentIndex + 1
      if (next >= queue.length) {
        if (repeatMode === 'all') next = 0
        else return
      }
    }
    setCurrentIndex(next)
    const track = queue[next]
    setCurrentTrack(track)
    setIsPlaying(true)
    setCurrentTime(0)
    setDuration(0)
  }, [queue, currentIndex, shuffleMode, repeatMode])

  const prevTrack = useCallback(() => {
    if (currentTime > 3) {
      seek(0)
      return
    }
    const prev = currentIndex - 1
    if (prev < 0) return
    setCurrentIndex(prev)
    const track = queue[prev]
    setCurrentTrack(track)
    setIsPlaying(true)
    setCurrentTime(0)
    setDuration(0)
  }, [currentIndex, currentTime, queue, seek])

  const playTrackAt = useCallback((index: number) => {
    if (index >= 0 && index < queue.length) {
      setCurrentIndex(index)
      setCurrentTrack(queue[index])
      setCurrentTime(0)
      setDuration(0)
      setIsPlaying(true)
      setShowMiniPlayer(true)
    }
  }, [queue])

  const addToQueue = useCallback((track: MusicTrack) => {
    setQueue(prev => [...prev, track])
  }, [])

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => {
      if (prev.length <= 1) return prev
      const updated = prev.filter((_, i) => i !== index)
      if (index < currentIndex) {
        setCurrentIndex(c => Math.max(0, c - 1))
      } else if (index === currentIndex) {
        const nextIdx = index < updated.length ? index : 0
        setCurrentIndex(nextIdx)
        setCurrentTrack(updated[nextIdx] || null)
      }
      return updated
    })
  }, [currentIndex])

  const reorderQueue = useCallback((startIndex: number, endIndex: number) => {
    setQueue(prev => {
      const result = Array.from(prev)
      const [removed] = result.splice(startIndex, 1)
      result.splice(endIndex, 0, removed)
      
      // Adjust currentIndex accordingly
      if (currentIndex === startIndex) {
        setCurrentIndex(endIndex)
      } else if (startIndex < currentIndex && endIndex >= currentIndex) {
        setCurrentIndex(c => c - 1)
      } else if (startIndex > currentIndex && endIndex <= currentIndex) {
        setCurrentIndex(c => c + 1)
      }
      return result
    })
  }, [currentIndex])

  const clearQueue = useCallback(() => {
    if (currentTrack) {
      setQueue([currentTrack])
      setCurrentIndex(0)
    } else {
      setQueue([])
      setCurrentIndex(0)
    }
  }, [currentTrack])

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        let data = e.data
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch {
            return
          }
        }
        if (!data || typeof data !== 'object') return

        if ((data.event === 'infoDelivery' || data.event === 'initialDelivery') &&
            data.info) {
          if (typeof data.info.currentTime === 'number') {
            setCurrentTime(data.info.currentTime)
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(data.info.duration)
          }
          if (typeof data.info.playerState === 'number') {
            // 1 = playing, 2 = paused, 0 = ended
            if (data.info.playerState === 1) {
              setIsPlaying(true)
            } else if (data.info.playerState === 2) {
              setIsPlaying(false)
            } else if (data.info.playerState === 0) {
              setIsPlaying(false)
              if (repeatMode === 'one') {
                post({ event: 'command', func: 'seekTo', args: [0, true] })
                post({ event: 'command', func: 'playVideo', args: [] })
                setIsPlaying(true)
              } else {
                nextTrack()
              }
            }
          }
        }

        if (data.event === 'onStateChange') {
          if (data.info === 1) {
            setIsPlaying(true)
          } else if (data.info === 2) {
            setIsPlaying(false)
          } else if (data.info === 0) {
            // Track ended
            setIsPlaying(false)
            if (repeatMode === 'one') {
              post({ event: 'command', func: 'seekTo', args: [0, true] })
              post({ event: 'command', func: 'playVideo', args: [] })
              setIsPlaying(true)
            } else {
              nextTrack()
            }
          }
        }
      } catch {}
    }
    window.addEventListener('message', handleMessage)
    return () =>
      window.removeEventListener('message', handleMessage)
  }, [repeatMode, nextTrack, post])

  useEffect(() => {
    if (!currentTrack) return
    const sendListening = () => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'listening',
            id: 1,
          }),
          '*'
        )
      }
    }
    sendListening()
    const interval = setInterval(sendListening, 500)
    return () => clearInterval(interval)
  }, [currentTrack])

  const updateMediaSession = useCallback(
    (track: MusicTrack | null) => {
      if (
        !track ||
        typeof window === 'undefined' ||
        !('mediaSession' in navigator)
      ) return

      navigator.mediaSession.metadata =
        new MediaMetadata({
          title: track.title,
          artist: track.channel_name ||
            'Play Nexa',
          album: 'YT Music',
          artwork: track.thumbnail ? [
            {
              src: track.thumbnail,
              sizes: '480x360',
              type: 'image/jpeg',
            }
          ] : [],
        })

      navigator.mediaSession.setActionHandler(
        'play', () => {
          iframeRef.current
            ?.contentWindow?.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'playVideo',
              args: [],
            }), '*'
          )
          setIsPlaying(true)
        }
      )

      navigator.mediaSession.setActionHandler(
        'pause', () => {
          iframeRef.current
            ?.contentWindow?.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'pauseVideo',
              args: [],
            }), '*'
          )
          setIsPlaying(false)
        }
      )

      navigator.mediaSession.setActionHandler(
        'nexttrack', () => {
          nextTrack?.()
        }
      )

      navigator.mediaSession.setActionHandler(
        'previoustrack', () => {
          prevTrack?.()
        }
      )
    },
    [nextTrack, prevTrack]
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState =
      isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  const playTrack = useCallback(async (track: MusicTrack, allTracks: MusicTrack[]) => {
    broadcastStop('ytmusic')
    setCurrentTrack(track)
    setIsPlaying(true)
    updateMediaSession(track)
    setShowMiniPlayer(true)
    setCurrentTime(0)
    setDuration(0)

    // Build queue
    const idx = allTracks.findIndex(t => t.id === track.id)
    setQueue(allTracks)
    setCurrentIndex(idx >= 0 ? idx : 0)
  }, [updateMediaSession])

  const togglePlay = useCallback(() => {
    const next = !isPlaying
    setIsPlaying(next)
    post({
      event: 'command',
      func: next ? 'playVideo' : 'pauseVideo',
      args: [],
    })
  }, [isPlaying, post])

  const formatTime = (s: number): string => {
    if (!s || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const iframeSrc = currentTrack
    ? `https://www.youtube.com/embed/` +
      `${currentTrack.youtube_id}` +
      `?autoplay=1` +
      `&controls=0` +
      `&enablejsapi=1` +
      `&playsinline=1` +
      `&rel=0` +
      `&modestbranding=1` +
      `&iv_load_policy=3` +
      `&origin=${encodeURIComponent(
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://play-nexa.vercel.app'
      )}`
    : undefined

  return (
    <MusicContext.Provider
      value={{
        currentTrack,
        queue,
        currentIndex,
        isPlaying,
        currentTime,
        duration,
        progress,
        shuffleMode,
        repeatMode,
        playbackRate,
        setPlaybackRate,
        iframeRef,
        playTrack,
        playTrackAt,
        addToQueue,
        removeFromQueue,
        reorderQueue,
        clearQueue,
        togglePlay,
        nextTrack,
        prevTrack,
        toggleShuffle: () => setShuffleMode(s => !s),
        toggleRepeat: () => setRepeatMode(r => (r === 'none' ? 'all' : r === 'all' ? 'one' : 'none')),
        seek,
        formatTime,
        showMiniPlayer,
        setShowMiniPlayer,
      }}
    >
      {children}

      {/* GLOBAL iframe — ALWAYS mounted when track is playing */}
      {currentTrack && (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          allow="autoplay; encrypted-media"
          title={currentTrack.title}
          style={{
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      )}
    </MusicContext.Provider>
  )
}

export function useMusicContext() {
  const ctx = useContext(MusicContext)
  if (!ctx) throw new Error('useMusicContext must be inside MusicProvider')
  return ctx
}
