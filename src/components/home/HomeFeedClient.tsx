'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Bell, RefreshCw } from 'lucide-react'
import FeaturedBanner from '@/components/movies/FeaturedBanner'
import MovieCard, { Movie } from '@/components/movies/MovieCard'
import SkeletonCard from '@/components/ui/SkeletonCard'

function interleaveMovies(trending: Movie[], newReleases: Movie[]): Movie[] {
  const result: Movie[] = []
  const seen = new Set<string>()

  const tList = [...trending]
  const nList = [...newReleases]

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

const sectionTitleStyle: React.CSSProperties = {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'system-ui, sans-serif',
  margin: '0 0 12px 0',
}

const rowScrollStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  overflowX: 'auto',
  paddingBottom: 8,
  contentVisibility: 'auto',
  containIntrinsicSize: '0 200px',
}

export default function HomeFeedClient() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [rawTrending, setRawTrending] = useState<Movie[]>([])
  const [rawNewReleases, setRawNewReleases] = useState<Movie[]>([])
  const [rawRecommended, setRawRecommended] = useState<Movie[]>([])
  const [contentType, setContentType] = useState<'all' | 'movie' | 'natok'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [bannerIndex, setBannerIndex] = useState(0)
  const bannerRef = useRef<NodeJS.Timeout>(undefined)

  // Get Firebase user
  useEffect(() => {
    import('@/lib/firebase').then(({ auth }) => {
      const { onAuthStateChanged } = require('firebase/auth')
      const unsub = onAuthStateChanged(auth, (user: any) => {
        setUserId(user?.uid || null)
      })
      return () => unsub()
    }).catch(() => {})
  }, [])

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
      const recommended: Movie[] = data.recommended && data.recommended.length > 0
        ? data.recommended
        : interleaveMovies(trending, newReleases)

      setRawTrending(trending)
      setRawNewReleases(newReleases)
      setRawRecommended(recommended)
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
    fetchFeed(true)
  }

  // Client-side filtering by content_type
  const filterByType = (list: Movie[]) => {
    if (contentType === 'all') return list
    return list.filter((item: any) => item.content_type === contentType)
  }

  const trendingList = filterByType(rawTrending)
  const newReleasesList = filterByType(rawNewReleases)
  const recommendedList = filterByType(rawRecommended)

  // Compute 3-5 top items for Featured Banner from combined trending + new releases
  const combinedRaw = interleaveMovies(rawTrending, rawNewReleases)
  const filteredCombined = filterByType(combinedRaw)
  const featuredList = filteredCombined.slice(0, 5)

  // Banner auto-rotate
  useEffect(() => {
    setBannerIndex(0)
  }, [contentType])

  useEffect(() => {
    if (featuredList.length <= 1) return
    bannerRef.current = setInterval(() => {
      setBannerIndex((i) => (i + 1) % featuredList.length)
    }, 5000)
    return () => {
      if (bannerRef.current) clearInterval(bannerRef.current)
    }
  }, [featuredList.length])

  const handleSaveFromBanner = async (movieId: string) => {
    if (!userId) {
      router.push('/auth/login')
      return
    }
    try {
      await fetch('/api/movies/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          userId,
          movieId,
          youtubeId: featuredList.find((m) => m.id === movieId)?.youtube_id || '',
        }),
      })
    } catch {}
  }

  const hasContent =
    featuredList.length > 0 ||
    trendingList.length > 0 ||
    newReleasesList.length > 0 ||
    recommendedList.length > 0

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

            {/* Notification Bell */}
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

      {/* ── Main Content ── */}
      {isLoading ? (
        <div className="min-h-screen bg-[#0D0D0D] pb-24">
          {/* Banner skeleton */}
          <div className="mb-6">
            <div className="relative w-full aspect-video bg-[#1A1A2E]" />
          </div>
          {/* Section row skeletons */}
          <div className="px-4 space-y-8">
            <div>
              <div className="h-5 bg-[#1A1A2E] rounded-lg w-1/4 mb-3" />
              <div className="flex gap-3 overflow-x-hidden">
                <SkeletonCard variant="landscape" count={2} />
              </div>
            </div>
            <div>
              <div className="h-5 bg-[#1A1A2E] rounded-lg w-1/4 mb-3" />
              <div className="flex gap-3 overflow-x-hidden">
                <SkeletonCard variant="landscape" count={2} />
              </div>
            </div>
          </div>
        </div>
      ) : !hasContent ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
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
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-[#1A1A2E] hover:bg-[#252538] border border-[#2D2D44] text-xs font-semibold text-white rounded-full active:opacity-60 transition-colors"
          >
            Try Refreshing
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── Featured Banner ── */}
          {featuredList.length > 0 && (
            <div className="mb-6">
              <FeaturedBanner
                movies={featuredList as any}
                currentIndex={bannerIndex}
                onIndexChange={setBannerIndex}
                onPlay={(id) => router.push(`/movies/${id}`)}
                onSave={handleSaveFromBanner}
              />
            </div>
          )}

          {/* ── Horizontal Scrolling Rows ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 32,
              padding: '0 16px',
            }}
          >
            {/* Trending Now */}
            {trendingList.length > 0 && (
              <section>
                <h2 style={sectionTitleStyle}>Trending Now</h2>
                <div style={rowScrollStyle} className="hide-scroll">
                  {trendingList.map((m) => (
                    <MovieCard
                      key={m.id}
                      movie={m}
                      variant="landscape"
                      onPress={() => router.push(`/movies/${m.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* New Releases */}
            {newReleasesList.length > 0 && (
              <section>
                <h2 style={sectionTitleStyle}>New Releases</h2>
                <div style={rowScrollStyle} className="hide-scroll">
                  {newReleasesList.map((m) => (
                    <MovieCard
                      key={m.id}
                      movie={m}
                      variant="landscape"
                      onPress={() => router.push(`/movies/${m.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Recommended for You */}
            {recommendedList.length > 0 && (
              <section>
                <h2 style={sectionTitleStyle}>Recommended for You</h2>
                <div style={rowScrollStyle} className="hide-scroll">
                  {recommendedList.map((m) => (
                    <MovieCard
                      key={m.id}
                      movie={m}
                      variant="landscape"
                      onPress={() => router.push(`/movies/${m.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
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
