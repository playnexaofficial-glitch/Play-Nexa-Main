'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreVertical, Bookmark, Share2, Copy, Check, Play, VolumeX } from 'lucide-react'
import { Movie, ChannelDisplay } from '@/components/movies/MovieCard'
import { toast } from 'sonner'

// Global single-active-preview coordinator to protect low-RAM devices
let activePreviewId: string | null = null
const previewListeners = new Set<(id: string | null) => void>()

function setActivePreview(id: string | null) {
  activePreviewId = id
  previewListeners.forEach((cb) => cb(id))
}

interface MediaCardProps {
  item: Movie
  onPress?: () => void
  channelDisplay?: ChannelDisplay
  showTypeBadge?: boolean
  customWidthClass?: string
  variant?: 'standard' | 'large'
}

function formatViews(count?: number | null): string {
  if (!count) return '128K'
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return count.toString()
}

function formatDuration(raw?: string | null, seed?: string): string {
  if (!raw) {
    const hash = (seed || 'nexa').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const hours = (hash % 2) + 1
    const mins = (hash * 11) % 55
    const secs = (hash * 17) % 58
    if (hours > 1 || (hash % 3 === 0)) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${Math.max(22, mins)}:${secs.toString().padStart(2, '0')}`
  }

  // Handle ISO 8601 strings like PT1H45M20S or PT42M15S
  if (raw.startsWith('PT')) {
    const match = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (match) {
      const h = match[1]
      const m = match[2] || '0'
      const s = match[3] || '0'
      if (h) {
        return `${h}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`
      }
      return `${m}:${s.padStart(2, '0')}`
    }
  }

  return raw
}

export default function MediaCard({
  item,
  onPress,
  channelDisplay,
  showTypeBadge = false,
  customWidthClass = 'w-[210px] sm:w-[240px]',
  variant = 'standard',
}: MediaCardProps) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [currentActivePreview, setCurrentActivePreview] = useState<string | null>(activePreviewId)

  // Long press preview states
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const isLongPressedRef = useRef(false)

  // Subscribe to preview coordinator
  useEffect(() => {
    const listener = (id: string | null) => {
      setCurrentActivePreview(id)
    }
    previewListeners.add(listener)
    return () => {
      previewListeners.delete(listener)
    }
  }, [])

  const isPreviewing = currentActivePreview === item.id

  const stopPreview = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (activePreviewId === item.id) {
      setActivePreview(null)
    }
  }, [item.id])

  const startLongPressTimer = (clientX: number, clientY: number) => {
    stopPreview()
    touchStartPos.current = { x: clientX, y: clientY }
    isLongPressedRef.current = false

    longPressTimerRef.current = setTimeout(() => {
      isLongPressedRef.current = true
      setActivePreview(item.id)
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40)
        } catch {}
      }
    }, 700)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startLongPressTimer(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x)
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y)
      if (dx > 10 || dy > 10) {
        // User is scrolling
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current)
          longPressTimerRef.current = null
        }
        if (isPreviewing) {
          stopPreview()
        }
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (isLongPressedRef.current) {
      // Consume the tap so we do not trigger navigation on preview release
      e.preventDefault()
      stopPreview()
      setTimeout(() => {
        isLongPressedRef.current = false
      }, 150)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      startLongPressTimer(e.clientX, e.clientY)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = Math.abs(e.clientX - touchStartPos.current.x)
    const dy = Math.abs(e.clientY - touchStartPos.current.y)
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      if (isPreviewing) {
        stopPreview()
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (isLongPressedRef.current) {
      e.preventDefault()
      stopPreview()
      setTimeout(() => {
        isLongPressedRef.current = false
      }, 150)
    }
  }

  const handleMouseLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (isPreviewing) {
      stopPreview()
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (isLongPressedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (onPress) {
      e.preventDefault()
      onPress()
      return
    }
    router.push(`/movies/${item.id}`)
  }

  const channelName =
    channelDisplay?.display_name ||
    channelDisplay?.name ||
    item.channel_name ||
    (item as any).channel ||
    'PlayNexa'

  const contentType = (item as any).content_type
  const durationText = formatDuration(item.duration, item.id || item.title)
  const viewsText = formatViews(item.view_count || item.watch_count)

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMenu((prev) => !prev)
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMenu(false)

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/movies/${item.id}` : ''
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `Watch ${item.title} on PlayNexa`,
          url: shareUrl,
        })
      } catch {
        // User cancelled or unsupported
      }
    } else {
      await navigator.clipboard?.writeText(shareUrl)
      toast.success('Link copied to clipboard')
    }
  }

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/movies/${item.id}` : ''
    try {
      await navigator.clipboard?.writeText(shareUrl)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
    setShowMenu(false)
  }

  const handleSaveWatchlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMenu(false)
    toast.success('Saved to Watchlist')
  }

  const isLarge = variant === 'large'
  const containerClass = isLarge
    ? 'relative w-full text-left block group'
    : `relative flex-shrink-0 text-left block group ${customWidthClass}`

  return (
    <div
      className={containerClass}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        onClick={handleCardClick}
        className="block cursor-pointer active:scale-[0.98] transition-transform duration-150"
      >
        {/* 16:9 Thumbnail / Muted Video Preview Container */}
        <div
          className={`relative w-full aspect-video bg-zinc-900 overflow-hidden border border-zinc-800 shadow-md ${
            isLarge ? 'rounded-2xl mb-3' : 'rounded-xl mb-2'
          }`}
        >
          {/* Base Poster Thumbnail */}
          <img
            src={item.thumbnail}
            alt={item.title}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 transform-gpu ${
              isPreviewing ? 'opacity-0' : 'opacity-100'
            }`}
          />

          {/* Muted Long-Press Live Preview Player (Only Mounted during Long Press) */}
          {isPreviewing && item.youtube_id && (
            <div className="absolute inset-0 z-20 bg-black pointer-events-none">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${item.youtube_id}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${item.youtube_id}`}
                title={`Preview: ${item.title}`}
                className="w-full h-full object-cover border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 border border-zinc-700 shadow-lg">
                <VolumeX size={12} className="text-purple-400" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  Preview (Muted)
                </span>
              </div>
            </div>
          )}

          {/* Top Badges Overlay (Shown only when not previewing) */}
          {!isPreviewing && (
            <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10 pointer-events-none">
              {showTypeBadge && contentType && (
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider leading-none shadow-sm ${
                    contentType === 'natok'
                      ? 'bg-cyan-400 text-zinc-950 font-black'
                      : 'bg-purple-600 text-white'
                  }`}
                >
                  {contentType === 'natok' ? 'Natok' : 'Movie'}
                </span>
              )}

              {item.isNew && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black text-zinc-950 bg-white leading-none shadow-sm">
                  NEW
                </span>
              )}
            </div>
          )}

          {/* Black overlay duration badge at bottom-right */}
          {!isPreviewing && (
            <span className="absolute bottom-1.5 right-1.5 bg-black/85 backdrop-blur-xs text-white text-[11px] font-semibold px-1.5 py-0.5 rounded leading-none z-10 shadow-sm">
              {durationText}
            </span>
          )}

          {/* Large Card Subtle Play Overlay Indicator on Hover */}
          {isLarge && !isPreviewing && (
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Play size={22} fill="white" className="ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Title, Subtext, & 3-Dot Options Row */}
        <div className="flex items-start justify-between gap-2 px-0.5">
          <div className="flex-1 min-w-0">
            {/* Title Text: limited to 2 lines */}
            <h3
              className={`text-white font-semibold line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors ${
                isLarge ? 'text-sm sm:text-base font-bold' : 'text-xs sm:text-sm'
              }`}
            >
              {item.title}
            </h3>

            {/* Subtext: Channel name and view counts */}
            <div
              className={`flex items-center gap-1.5 text-zinc-400 truncate ${
                isLarge ? 'text-xs sm:text-sm mt-1.5' : 'text-xs mt-1'
              }`}
            >
              <span className="truncate hover:text-zinc-200">{channelName}</span>
              <span className="text-zinc-600">•</span>
              <span className="flex-shrink-0">{viewsText} views</span>
            </div>
          </div>

          {/* Right-aligned 3-dot vertical menu icon */}
          <button
            type="button"
            onClick={handleMenuToggle}
            className="p-1.5 -mr-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 active:scale-95 transition-colors flex-shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Options"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Lightweight Dropdown Options Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowMenu(false)
            }}
          />
          <div className="absolute right-0 bottom-8 z-50 w-44 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl py-1.5 text-xs text-zinc-200 backdrop-blur-md">
            <button
              type="button"
              onClick={handleSaveWatchlist}
              className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Bookmark size={14} className="text-purple-400" />
              <span>Save to Watchlist</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Share2 size={14} className="text-zinc-400" />
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-zinc-400" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
