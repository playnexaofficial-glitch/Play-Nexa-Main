'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Bookmark, Sparkles } from 'lucide-react'
import { Movie } from '@/components/movies/MovieCard'

interface FeaturedHeroCardProps {
  items: Movie[]
  userId?: string | null
  onSave?: (id: string) => void
}

export default function FeaturedHeroCard({
  items,
  userId,
  onSave,
}: FeaturedHeroCardProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const timerRef = useRef<NodeJS.Timeout>(undefined)

  const current = items[currentIndex]

  // Auto-rotate every 6 seconds if multiple items
  useEffect(() => {
    if (items.length <= 1) return

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length)
    }, 6000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [items.length])

  // Reset index when items list changes
  useEffect(() => {
    setCurrentIndex(0)
  }, [items])

  if (!current) return null

  const handlePlay = (id: string) => {
    router.push(`/movies/${id}`)
  }

  const handleSave = (id: string) => {
    if (onSave) {
      onSave(id)
    } else {
      router.push(`/movies/${id}`)
    }
  }

  const contentType = (current as any).content_type
  const channelName = current.channel_name || (current as any).channel || 'PlayNexa'
  const genreList = (current as any).genre

  return (
    <div className="relative px-4">
      {/* 16:9 Cinematic Hero Poster */}
      <div className="relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl transform-gpu">
        {/* Dominant HD Thumbnail */}
        <img
          src={current.thumbnail}
          alt={current.title}
          loading="eager"
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        />

        {/* Cinematic Gradient Overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(9,9,11,0.98) 0%, rgba(9,9,11,0.68) 45%, rgba(9,9,11,0.15) 80%, transparent 100%)',
          }}
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10 pointer-events-none">
          {/* New Badge */}
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-zinc-950 bg-white shadow-md">
            NEW
          </span>

          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white bg-purple-600 shadow-md">
            <Sparkles size={11} />
            Featured
          </span>

          {contentType && (
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                contentType === 'natok'
                  ? 'bg-cyan-400 text-zinc-950 font-black'
                  : 'bg-zinc-800/80 backdrop-blur-sm text-zinc-200 border border-zinc-700/60'
              }`}
            >
              {contentType === 'natok' ? 'Natok' : 'Movie'}
            </span>
          )}
        </div>

        {/* Bottom Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 z-10">
          <p className="text-white font-extrabold text-base sm:text-lg mb-1 line-clamp-2 leading-snug drop-shadow-md">
            {current.title}
          </p>

          <p className="text-zinc-400 text-xs mb-3 truncate font-medium">
            {channelName}
            {Array.isArray(genreList) && genreList.length ? ` · ${genreList[0]}` : ''}
          </p>

          {/* Action Buttons: Prominent Play Now Button */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePlay(current.id)}
              className="flex-1 h-10 sm:h-11 rounded-xl text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
              aria-label={`Play Now ${current.title}`}
            >
              <Play size={16} fill="currentColor" />
              <span>Play Now</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(current.id)}
              className="h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-200 bg-zinc-900/80 hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 border border-zinc-700/60 backdrop-blur-sm"
              aria-label={`Save ${current.title}`}
            >
              <Bookmark size={16} />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern Dot Indicators */}
      {items.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-2.5">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className="rounded-full transition-all duration-200 active:opacity-60"
              style={{
                width: i === currentIndex ? '22px' : '6px',
                height: '5px',
                backgroundColor: i === currentIndex ? '#9333ea' : '#3f3f46',
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
