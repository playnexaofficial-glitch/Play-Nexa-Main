'use client'
import {
  useState, useEffect, useRef, useCallback
} from 'react'
import { broadcastStop, onStopRequest } from '@/lib/audioCoordinator'

const QUEUE_KEY = 'pn_music_queue'
const STATE_KEY = 'pn_music_state'

export interface LocalTrack {
  id: string
  uri: string
  title: string
  artist: string
  duration?: number
  fileName: string
  file?: File        // Keep File object in memory
  size?: number
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [tracks, setTracks] = useState<LocalTrack[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const isInitialized = useRef(false)

  const currentTrack = tracks[currentIndex] || null

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      broadcastStop('device')
      setError('')
      await audio.play()
    } catch (e: any) {
      setError('Playback failed: ' + e.message)
      setIsPlaying(false)
    }
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) play()
    else pause()
  }, [play, pause])

  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    if (isNaN(time) || !isFinite(time)) return
    audio.currentTime = Math.max(0,
      Math.min(time, audio.duration || 0))
    setCurrentTime(audio.currentTime)
  }, [])

  const nextTrack = useCallback(() => {
    setCurrentIndex(prev =>
      (prev + 1) % Math.max(tracks.length, 1)
    )
  }, [tracks.length])

  const prevTrack = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      seek(0)
      play()
      return
    }
    setCurrentIndex(prev =>
      prev === 0
        ? Math.max(tracks.length - 1, 0)
        : prev - 1
    )
  }, [tracks.length, play, seek])

  const setMediaSession = useCallback(
    (track: LocalTrack) => {
      if (typeof window === 'undefined' || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return
      try {
        navigator.mediaSession.metadata =
          new MediaMetadata({
            title: track.title,
            artist: track.artist || 'Local File',
            album: 'Play Nexa',
          })
        navigator.mediaSession.setActionHandler('play', () => {
          audioRef.current?.play()
        })
        navigator.mediaSession.setActionHandler('pause', () => {
          audioRef.current?.pause()
        })
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          nextTrack()
        })
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          prevTrack()
        })
      } catch {}
    }, [nextTrack, prevTrack])

  // Initialize audio element ONCE
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    const audio = new Audio()
    audio.preload = 'metadata'

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime || 0)
    })

    audio.addEventListener('durationchange', () => {
      if (audio.duration &&
          !isNaN(audio.duration) &&
          isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    })

    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration &&
          !isNaN(audio.duration) &&
          isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
      setIsLoading(false)
    })

    audio.addEventListener('canplaythrough', () => {
      setIsLoading(false)
      setError('')
    })

    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      // Trigger next track
      window.dispatchEvent(
        new CustomEvent('music:trackended'))
    })

    audio.addEventListener('error', () => {
      const err = audio.error
      let msg = 'Cannot play this file'
      if (err) {
        switch (err.code) {
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            msg = 'Format not supported. Use MP3 or AAC files.'
            break
          case 3: // MEDIA_ERR_DECODE
            msg = 'File is corrupted or cannot be decoded'
            break
          case 2: // MEDIA_ERR_NETWORK
            msg = 'Could not load the audio file'
            break
          case 1: // MEDIA_ERR_ABORTED
            msg = 'Playback was stopped'
            break
          default:
            msg = 'Cannot play this file'
        }
      }
      setError(msg)
      setIsLoading(false)
      setIsPlaying(false)
    })

    audio.addEventListener('waiting', () => {
      setIsLoading(true)
    })

    // Request Wake Lock to keep audio alive
    // when screen dims or user switches apps
    let wakeLock: any = null

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any)
            .wakeLock.request('screen')
        }
      } catch {
        // Wake lock not supported or denied — ok
      }
    }

    const releaseWakeLock = () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {})
        wakeLock = null
      }
    }

    // Re-acquire wake lock when page becomes visible
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }

    document.addEventListener(
      'visibilitychange', onVisibilityChange)

    audio.addEventListener('playing', () => {
      requestWakeLock()
      setIsLoading(false)
      setIsPlaying(true)
      setError('')
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState =
          'playing'
      }
    })

    audio.addEventListener('pause', () => {
      releaseWakeLock()
      setIsPlaying(false)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState =
          'paused'
      }
    })

    audioRef.current = audio

    // Stop when another source plays
    const cleanup = onStopRequest(
      'device',
      () => {
        audio.pause()
        setIsPlaying(false)
      }
    )

    return () => {
      cleanup()
      audio.pause()
      audio.src = ''
      releaseWakeLock()
      document.removeEventListener(
        'visibilitychange', onVisibilityChange)
    }
  }, [])

  // Listen for track ended event
  useEffect(() => {
    const handler = () => {
      nextTrack()
    }
    window.addEventListener(
      'music:trackended', handler)
    return () =>
      window.removeEventListener(
        'music:trackended', handler)
  }, [nextTrack])

  // Load track when index or tracks change
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    setIsLoading(true)
    setError('')
    setCurrentTime(0)
    setDuration(0)

    audio.pause()
    audio.removeAttribute('src')
    audio.load()

    let createdUrl: string | null = null

    if (currentTrack.file instanceof File) {
      // Most reliable: fresh blob URL from File object
      createdUrl = URL.createObjectURL(currentTrack.file)
      audio.src = createdUrl
    } else if (currentTrack.uri) {
      // Fallback: use stored URI
      audio.src = currentTrack.uri
    } else {
      setError('No audio source found')
      setIsLoading(false)
      return
    }

    audio.load()

    // Update media session for lock screen
    if (
      currentTrack &&
      typeof window !== 'undefined' &&
      'mediaSession' in navigator &&
      typeof MediaMetadata !== 'undefined'
    ) {
      try {
        navigator.mediaSession.metadata =
          new MediaMetadata({
            title: currentTrack.title,
            artist: currentTrack.artist ||
              'Device Music',
            album: 'Play Nexa',
          })

        navigator.mediaSession.setActionHandler(
          'play', () => {
            audioRef.current?.play()
              .catch(() => {})
          }
        )
        navigator.mediaSession.setActionHandler(
          'pause', () => {
            audioRef.current?.pause()
          }
        )
        navigator.mediaSession.setActionHandler(
          'nexttrack', () => nextTrack()
        )
        navigator.mediaSession.setActionHandler(
          'previoustrack', () => prevTrack()
        )
      } catch {}
    }

    const onCanPlay = () => {
      audio.play().catch(() => {})
      audio.removeEventListener('canplay', onCanPlay)
    }
    audio.addEventListener('canplay', onCanPlay)

    // Persist current position
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          index: currentIndex
        })
      )
    } catch {}

    return () => {
      audio.removeEventListener('canplay', onCanPlay)
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [currentIndex, currentTrack, nextTrack, prevTrack])

  const playAt = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  const loadTracks = useCallback(
    (newTracks: LocalTrack[], startIndex = 0) => {
      setTracks(newTracks)
      setCurrentIndex(startIndex)
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      setError('')

      // Persist queue to localStorage
      try {
        localStorage.setItem(
          QUEUE_KEY,
          JSON.stringify(
            newTracks.map(t => ({
              id: t.id,
              uri: t.uri,
              title: t.title,
              artist: t.artist,
              fileName: t.fileName,
              duration: t.duration,
              size: t.size,
              // Note: File objects cannot be
              // serialized — uri will be used
            }))
          )
        )
        localStorage.setItem(
          STATE_KEY,
          JSON.stringify({ index: startIndex })
        )
      } catch {}
    }, [])

  const restoreQueue = useCallback(() => {
    try {
      const qRaw =
        localStorage.getItem(QUEUE_KEY)
      const sRaw =
        localStorage.getItem(STATE_KEY)
      if (!qRaw) return false
      const savedTracks = JSON.parse(qRaw)
      const savedState = sRaw
        ? JSON.parse(sRaw)
        : { index: 0 }
      if (!Array.isArray(savedTracks) ||
          savedTracks.length === 0)
        return false
      setTracks(savedTracks)
      setCurrentIndex(savedState.index || 0)
      return true
    } catch {
      return false
    }
  }, [])

  const progress = duration > 0
    ? Math.min((currentTime / duration) * 100, 100)
    : 0

  const formatTime = (s: number): string => {
    if (!s || isNaN(s) || !isFinite(s))
      return '0:00'
    const m = Math.floor(Math.abs(s) / 60)
    const sec = Math.floor(Math.abs(s) % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return {
    tracks,
    currentTrack,
    currentIndex,
    isPlaying,
    isLoading,
    error,
    currentTime,
    duration,
    progress,
    toggle,
    play,
    pause,
    seek,
    nextTrack,
    prevTrack,
    playAt,
    loadTracks,
    formatTime,
    restoreQueue,
  }
}
