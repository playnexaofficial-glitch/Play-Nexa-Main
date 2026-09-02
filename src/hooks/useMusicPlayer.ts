'use client'
import { useState, useCallback, useEffect } from 'react'

export function useMusicPlayer(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const [isPlaying, setIsPlaying] =
    useState(false)
  const [currentTime, setCurrentTime] =
    useState(0)
  const [duration, setDuration] = useState(0)

  const progress = duration > 0
    ? (currentTime / duration) * 100 : 0

  const post = useCallback((data: any) => {
    iframeRef.current?.contentWindow
      ?.postMessage(JSON.stringify(data), '*')
  }, [iframeRef])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== 'https://www.youtube.com')
        return
      try {
        const d = typeof e.data === 'string'
          ? JSON.parse(e.data) : e.data
        if (d.event === 'onStateChange') {
          setIsPlaying(d.info === 1)
          if (d.info === 0) {
            // Track ended — signal to queue
            window.dispatchEvent(
              new CustomEvent('ytmusic:trackended'))
          }
        }
        if (d.event === 'infoDelivery' &&
            d.info?.currentTime !== undefined) {
          setCurrentTime(d.info.currentTime || 0)
          if (d.info.duration &&
              !isNaN(d.info.duration) &&
              isFinite(d.info.duration)) {
            setDuration(d.info.duration)
          }
        }
      } catch {}
    }
    window.addEventListener('message', handler)
    // Poll YouTube for current time every 500ms
    const pollInterval = setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: 'listening',
          id: 1,
        }), '*'
      )
    }, 500)

    return () => {
      window.removeEventListener('message', handler)
      clearInterval(pollInterval)
    }
  }, [iframeRef])

  const togglePlay = useCallback(() => {
    post({
      event: 'command',
      func: isPlaying ? 'pauseVideo' : 'playVideo',
      args: [],
    })
  }, [isPlaying, post])

  const seek = useCallback((time: number) => {
    post({
      event: 'command',
      func: 'seekTo',
      args: [time, true],
    })
    setCurrentTime(time)
  }, [post])

  const formatTime = (s: number): string => {
    if (!s || isNaN(s) || !isFinite(s))
      return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2,'0')}`
  }

  return {
    isPlaying,
    currentTime,
    duration,
    progress,
    togglePlay,
    seek,
    formatTime,
    setIsPlaying,
  }
}

