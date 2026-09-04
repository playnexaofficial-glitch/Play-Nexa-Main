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

  // Auto-rotate every 5 seconds if multiple items
  useEffect(() => {
    if (items.length <= 1) return

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length)
    }, 5000)

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
  const channelName = current.channel_name || (current as any).channel || 'Play Nexa'

  return (
    <div className="relative px-4">
      {/* Cinematic Card Container */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#141424] border border-[#24243B]/80 shadow-lg">
        {/* Dominant Thumbnail */}
        <img
          src={current.thumbnail}
          alt={current.title}
          loading="eager"
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-102"
        />

        {/* Subtle Dark Gradient Overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, #0D0D15 0%, rgba(13,13,21,0.75) 45%, rgba(13,13,21,0.15) 80%, transparent 100%)',
          }}
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white bg-[#7C3AED] shadow-md">
            <Sparkles size={11} />
            Featured
          </span>

          {contentType && (
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                contentType === 'natok'
                  ? 'bg-[#06B6D4] text-black font-extrabold'
                  : 'bg-white/20 backdrop-blur-sm text-white'
              }`}
            >
              {contentType === 'natok' ? 'Natok' : 'Movie'}
            </span>
          )}

          {current.isNew && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-black bg-white">
              New
            </span>
          )}
        </div>

        {/* Bottom Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 z-10">
          <p className="text-white font-bold text-base sm:text-lg mb-1 line-clamp-2 leading-snug drop-shadow-sm">
            {current.title}
          </p>

          <p className="text-[#9CA3AF] text-xs mb-3 truncate">
            {channelName}
            {current.genre?.length ? ` · ${current.genre[0]}` : ''}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePlay(current.id)}
              className="flex-1 h-10 rounded-xl text-xs sm:text-sm font-bold text-black bg-white hover:bg-neutral-100 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-md"
              aria-label={`Watch ${current.title}`}
            >
              <Play size={15} fill="currentColor" />
              Watch Now
            </button>

            <button
              type="button"
              onClick={() => handleSave(current.id)}
              className="h-10 px-3.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-white/15 hover:bg-white/20 active:scale-98 transition-all flex items-center justify-center gap-1.5 border border-white/10 backdrop-blur-sm"
              aria-label={`Save ${current.title}`}
            >
              <Bookmark size={15} />
              Save
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
                backgroundColor: i === currentIndex ? '#7C3AED' : '#2D2D44',
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
