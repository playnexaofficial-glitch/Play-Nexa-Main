'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, Bell, RefreshCw } from 'lucide-react'
import MovieCard, { Movie } from '@/components/movies/MovieCard'
import SkeletonCard from '@/components/ui/SkeletonCard'

function interleaveMovies(trending: Movie[], newReleases: Movie[]): Movie[] {
  const result: Movie[] = []
  const seen = new Set<string>()

  const tList = [...trending].sort(() => Math.random() - 0.5)
  const nList = [...newReleases].sort(() => Math.random() - 0.5)

  const maxLen = Math.max(tList.length, nList.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < tList.length) {
      const item = tList[i]
      if (!seen.has(item.id)) {
        seen.add(item.id)
        result.push(item)
      }
    }
    if (i < nList.length) {
      const item = nList[i]
      if (!seen.has(item.id)) {
        seen.add(item.id)
        result.push(item)
      }
    }
  }

  return result
}

export default function HomeFeedClient() {
  const [feedItems, setFeedItems] = useState<Movie[]>([])
  const [rawTrending, setRawTrending] = useState<Movie[]>([])
  const [rawNewReleases, setRawNewReleases] = useState<Movie[]>([])
  const [contentType, setContentType] = useState<'all' | 'movie' | 'natok'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)

      const res = await fetch('/api/movies/feed', {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const trending: Movie[] = data.trending || []
      const newReleases: Movie[] = data.newReleases || []

      setRawTrending(trending)
      setRawNewReleases(newReleases)
      setFeedItems(interleaveMovies(trending, newReleases))
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('Home feed timeout')
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchFeed(false)
  }, [fetchFeed])

  const handleRefresh = () => {
    if (rawTrending.length > 0 || rawNewReleases.length > 0) {
      setFeedItems(interleaveMovies(rawTrending, rawNewReleases))
    }
    fetchFeed(true)
  }

  // Client-side filtering by content_type
  const filteredFeed = feedItems.filter((item: any) => {
    if (contentType === 'all') return true
    return item.content_type === contentType
  })

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24 text-white">
      {/* ── Top Bar for Home ── */}
      <div className="sticky top-0 z-40 bg-[#0D0D0D]/95 backdrop-blur-md border-b border-[#1A1A2E]/80">
        {/* Header Row: Title/Logo + Search Trigger + Notification Bell + Refresh */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 gap-2.5">
          <div className="flex items-baseline gap-0 select-none">
            <span className="text-[#7C3AED] font-extrabold text-xl tracking-tight">Play</span>
            <span className="text-white font-extrabold text-xl tracking-tight">Nexa</span>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xs justify-end">
            {/* Search bar as navigation trigger */}
            <Link
              href="/movies/search"
              className="flex items-center gap-2 flex-1 max-w-[200px] h-9 px-3 bg-[#1A1A2E] text-[#9CA3AF] rounded-full border border-[#2D2D44] text-xs active:opacity-60 transition-opacity"
              aria-label="Search movies and natok"
            >
              <Search size={15} className="text-[#9CA3AF] flex-shrink-0" />
              <span className="truncate">Search movies, natok...</span>
            </Link>

            {/* Notification Bell (placeholder for now) */}
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-[#1A1A2E] border border-[#2D2D44] flex items-center justify-center text-[#9CA3AF] hover:text-white active:opacity-60 transition-colors flex-shrink-0"
              aria-label="Notifications"
            >
              <Bell size={17} />
            </button>

            {/* Refresh Affordance */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`w-9 h-9 rounded-full bg-[#1A1A2E] border border-[#2D2D44] flex items-center justify-center text-[#9CA3AF] hover:text-white active:opacity-60 transition-colors flex-shrink-0 ${
                isRefreshing ? 'animate-spin text-[#7C3AED]' : ''
              }`}
              aria-label="Refresh feed"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Filter Chips: All / Movie / Natok */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto hide-scroll">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'movie', label: 'Movie' },
              { id: 'natok', label: 'Natok' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setContentType(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap active:opacity-60 transition-colors ${
                contentType === tab.id
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-[#1A1A2E] text-[#9CA3AF] border border-[#2D2D44]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Feed Content ── */}
      {isLoading ? (
        <div className="px-4 pt-4 space-y-6 max-w-2xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="w-full aspect-video bg-[#1A1A2E] rounded-xl" />
              <div className="h-4 bg-[#1A1A2E] rounded w-3/4" />
              <div className="h-3 bg-[#1A1A2E] rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filteredFeed.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1A2E] flex items-center justify-center mb-4 text-[#6B7280]">
            <Search size={28} />
          </div>
          <p className="text-white font-semibold text-base mb-1">
            {contentType === 'natok'
              ? 'No natok found'
              : contentType === 'movie'
              ? 'No movies found'
              : 'No content available'}
          </p>
          <p className="text-[#9CA3AF] text-xs max-w-xs leading-relaxed">
            Content added to the library will automatically show up in your feed
          </p>
          <button
            onClick={() => handleRefresh()}
            className="mt-4 px-4 py-2 bg-[#1A1A2E] hover:bg-[#252538] border border-[#2D2D44] text-xs font-semibold text-white rounded-full active:opacity-60 transition-colors"
          >
            Try Refreshing
          </button>
        </div>
      ) : (
        /* Vertical Single-Column Scrolling Feed */
        <div className="px-4 pt-4 space-y-6 max-w-2xl mx-auto" style={{ contentVisibility: 'auto' }}>
          {filteredFeed.map((movie) => (
            <div key={movie.id} className="w-full">
              {/* Full-width container wrapping MovieCard */}
              <div className="[&>a]:!w-full [&>a>div]:!w-full">
                <MovieCard
                  movie={movie}
                  variant="landscape"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden SEO Content */}
      <div className="sr-only" aria-hidden="false">
        <h2>Play Nexa — Watch Free Movies and Bangla Natok Online</h2>
        <p>
          Stream Bangla movies, Hindi dubbed cinema, Bangla comedy natok, romantic dramas, telefilms,
          and web series online in HD. Free streaming without registration.
        </p>
      </div>
    </div>
  )
}
