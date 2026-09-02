'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

export interface VideoFile {
  id: string
  name: string
  displayName: string
  file: File
  objectUrl: string
  size: number
  type: string
  lastModified?: number
  thumbnailUrl?: string
  resolution?: string
  codec?: string
}

export function useVideoPlayer() {
  // This ref will be attached to a real
  // <video> element in the JSX via ref prop
  const videoRef = useRef<HTMLVideoElement>(null)
  const activeUrlsRef = useRef<Set<string>>(new Set())

  const [files, setFiles] = useState<VideoFile[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAudioMode, setIsAudioMode] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [brightness, setBrightness] = useState(1.0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [aspectRatio, setAspectRatio] = useState<'contain' | 'cover' | 'fill'>('contain')
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isLocked, setIsLocked] = useState(false)
  const [isLoop, setIsLoop] = useState(false)

  const currentFile = currentIndex >= 0 && currentIndex < files.length ? files[currentIndex] : null
  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0

  // Load track when index or currentFile changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !currentFile) return

    console.log('[Video] Loading:', currentFile.displayName, currentFile.objectUrl)

    setIsLoading(true)
    setError('')
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)

    // Set src directly on video element if not already matched
    if (video.src !== currentFile.objectUrl) {
      video.pause()
      video.src = currentFile.objectUrl
      video.load()
    }

    // Try to play after load
    const tryPlay = () => {
      video
        .play()
        .then(() => {
          console.log('[Video] Playing!')
          setIsLoading(false)
          setIsPlaying(true)
        })
        .catch(e => {
          console.warn('[Video] Auto-play prevented or gesture needed:', e.name, e.message)
          setIsLoading(false)
          setIsPlaying(false)
        })
    }

    video.addEventListener('canplay', tryPlay, { once: true })

    return () => {
      video.removeEventListener('canplay', tryPlay)
    }
  }, [currentFile])

  // Sync volume
  useEffect(() => {
    const video = videoRef.current
    if (video) video.volume = volume
  }, [volume])

  // Sync playback rate
  useEffect(() => {
    const video = videoRef.current
    if (video) video.playbackRate = playbackRate
  }, [playbackRate])

  // Sync loop mode
  useEffect(() => {
    const video = videoRef.current
    if (video) video.loop = isLoop
  }, [isLoop])

  // Audio mode: hide video visually
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.style.opacity = isAudioMode ? '0' : '1'
  }, [isAudioMode])

  // Extract thumbnail and metadata
  const extractThumbnailAndMetadata = useCallback(
    async (file: File): Promise<{ thumbnailUrl: string; resolution: string; codec: string }> => {
      return new Promise(resolve => {
        const video = document.createElement('video')
        const url = URL.createObjectURL(file)
        video.src = url
        video.currentTime = 3
        video.muted = true
        video.playsInline = true

        const onSeeked = () => {
          const w = video.videoWidth
          const h = video.videoHeight
          const resolution = w && h ? `${w}x${h}` : 'Unknown'

          const ext = file.name.split('.').pop()?.toLowerCase() || ''
          let codec = 'Unknown'
          if (ext === 'mp4' || ext === 'm4v') {
            codec = 'H.264 / AAC'
          } else if (ext === 'webm') {
            codec = 'VP9 / Vorbis'
          } else if (ext === 'mkv') {
            codec = 'HEVC / AC3'
          } else if (ext === 'avi') {
            codec = 'MPEG-4 / MP3'
          } else if (ext === 'mov') {
            codec = 'ProRes / AAC'
          } else if (file.type) {
            codec = file.type.replace('video/', '').toUpperCase()
          }

          const canvas = document.createElement('canvas')
          canvas.width = 160
          canvas.height = 90
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(video, 0, 0, 160, 90)
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.6)

          URL.revokeObjectURL(url)
          resolve({ thumbnailUrl, resolution, codec })
        }

        video.addEventListener('seeked', onSeeked, { once: true })
        video.addEventListener(
          'error',
          () => {
            URL.revokeObjectURL(url)
            resolve({ thumbnailUrl: '', resolution: 'Unknown', codec: 'Unknown' })
          },
          { once: true }
        )

        video.load()
      })
    },
    []
  )

  const loadFiles = useCallback(
    async (inputFiles: FileList | File[]) => {
      const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'm4v', '3gp', 'flv', 'wmv', 'ts', 'ogv']
      const arr = Array.from(inputFiles)

      const videoFiles = arr.filter(f => {
        const ext = f.name.split('.').pop()?.toLowerCase() || ''
        const byExt = videoExts.includes(ext)
        const byType = f.type.startsWith('video/')
        console.log('[Video] File:', f.name, 'ext:', ext, 'type:', f.type, 'valid:', byExt || byType)
        return byExt || byType
      })

      if (!videoFiles.length) {
        setError('No video files found. Please select MP4, MKV, AVI, MOV, or WebM files.')
        return
      }

      // Revoke previous URLs safely
      activeUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url)
        } catch {
          // ignore
        }
      })
      activeUrlsRef.current.clear()

      const newFiles: VideoFile[] = videoFiles.map((f, i) => {
        const url = URL.createObjectURL(f)
        activeUrlsRef.current.add(url)
        console.log('[Video] Created URL:', url, 'for:', f.name)
        return {
          id: `${Date.now()}-${i}`,
          name: f.name,
          displayName: f.name.replace(/\.[^/.]+$/, ''),
          file: f,
          objectUrl: url,
          size: f.size,
          type: f.type,
          lastModified: f.lastModified,
        }
      })

      setFiles(newFiles)
      setCurrentIndex(-1)
      setError('')

      // Extract thumbnails in background
      for (let i = 0; i < newFiles.length; i++) {
        extractThumbnailAndMetadata(newFiles[i].file).then(meta => {
          setFiles(prev =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    thumbnailUrl: meta.thumbnailUrl,
                    resolution: meta.resolution,
                    codec: meta.codec,
                  }
                : item
            )
          )
        })
      }
    },
    [extractThumbnailAndMetadata]
  )

  const playFile = useCallback((index: number) => {
    console.log('[Video] Playing index:', index)
    setCurrentIndex(index)
    setIsAudioMode(false)
    setIsLocked(false)
    setError('')
  }, [])

  const toggle = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(e => {
        console.error('[Video] Toggle play:', e.message)
      })
    } else {
      video.pause()
    }
  }, [])

  const seek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video || !isFinite(time)) return
    const clamped = Math.max(0, Math.min(time, video.duration || 0))
    video.currentTime = clamped
    setCurrentTime(clamped)
  }, [])

  const skipBy = useCallback(
    (seconds: number) => {
      const video = videoRef.current
      if (!video) return
      seek(video.currentTime + seconds)
    },
    [seek]
  )

  const next = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev < files.length - 1) return prev + 1
      return 0
    })
  }, [files.length])

  const prev = useCallback(() => {
    const video = videoRef.current
    if (video && video.currentTime > 3) {
      seek(0)
      return
    }
    setCurrentIndex(prev => {
      if (prev > 0) return prev - 1
      return files.length - 1
    })
  }, [files.length, seek])

  const cycleAspect = useCallback(() => {
    setAspectRatio(r => (r === 'contain' ? 'cover' : r === 'cover' ? 'fill' : 'contain'))
  }, [])

  const toggleAudioMode = useCallback(() => {
    setIsAudioMode(m => !m)
  }, [])

  const formatTime = (s: number): string => {
    if (!s || !isFinite(s) || s < 0) return '0:00'
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    }
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const formatSize = (bytes: number): string => {
    if (bytes > 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url)
        } catch {
          // ignore
        }
      })
      activeUrlsRef.current.clear()
    }
  }, [])

  return {
    videoRef,
    files,
    currentFile,
    currentIndex,
    isPlaying,
    setIsPlaying,
    isAudioMode,
    isLoading,
    setIsLoading,
    error,
    setError,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    volume,
    brightness,
    progress,
    aspectRatio,
    playbackRate,
    isLocked,
    isLoop,
    setIsLoop,
    loadFiles,
    playFile,
    toggle,
    seek,
    skipBy,
    next,
    prev,
    setVolume,
    setBrightness,
    cycleAspect,
    setPlaybackRate,
    toggleAudioMode,
    setIsLocked,
    formatTime,
    formatSize,
  }
}
