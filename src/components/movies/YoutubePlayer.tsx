'use client'

import { useEffect, useRef } from 'react'

interface YoutubePlayerProps {
  youtubeId?: string
  videoId?: string
  title?: string
  startAt?: number
  onEnded?: () => void
  onProgress?: (seconds: number) => void
}

export default function YoutubePlayer({
  youtubeId,
  videoId,
  title,
  startAt = 0,
  onEnded,
  onProgress,
}: YoutubePlayerProps) {
  const id = youtubeId || videoId || ''
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!onProgress && !onEnded) return

    let currentSec = startAt || 0
    const interval = setInterval(() => {
      currentSec += 1
      if (onProgress) {
        onProgress(currentSec)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startAt, onProgress, onEnded])

  const srcUrl = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1${
    startAt > 0 ? `&start=${Math.floor(startAt)}` : ''
  }`

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden">
      <iframe
        key={startAt ? `start-${startAt}` : 'initial'}
        ref={iframeRef}
        src={srcUrl}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        loading="lazy"
        allow="autoplay; fullscreen; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        title={title || 'YouTube video player'}
      />
    </div>
  )
}
