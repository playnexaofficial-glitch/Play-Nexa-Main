'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Bell, RefreshCw, Flame, Film, Tv, Sparkles, Compass } from 'lucide-react'
import { toast } from 'sonner'
import FeaturedHeroCard from '@/components/home/FeaturedHeroCard'
import MediaCard from '@/components/home/MediaCard'
import { Movie } from '@/components/movies/MovieCard'

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

export default function HomeFeedClient() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [rawTrending, setRawTrending] = useState<Movie[]>([])
  const [rawNewReleases, setRawNewReleases] = useState<Movie[]>([])
  const [rawRecommended, setRawRecommended] = useState<Movie[]>([])
  const [contentType, setContentType] = useState<'all' | 'movie' | 'natok'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Get Firebase user
  useEffect(() => {
    import('@/lib/firebase')
      .then(({ auth }) => {
        const { onAuthStateChanged } = require('firebase/auth')
        const unsub = onAuthStateChanged(auth, (user: any) => {
          setUserId(user?.uid || null)
        })
        return () => unsub()
      })
      .catch(() => {})
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
      const recommended: Movie[] =
        data.recommended && data.recommended.length > 0
          ? data.recommended
          : interleaveMovies(trending, newReleases)

      setRawTrending(trending)
      setRawNewReleases(newReleases)
      setRawRecommended(recommended)

      if (isRefresh) {
        toast.success('Feed refreshed')
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('Home feed timeout')
      }
      if (isRefresh) {
        toast.error('Could not refresh feed')
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

  const handleNotificationsClick = () => {
    toast.info('Notifications', {
      description: 'You are all caught up! No unread notifications.',
    })
  }

  // Client-side filtering by content_type
  const filterByType = (list: Movie[]) => {
    if (contentType === 'all') return list
    return list.filter((item: any) => item.content_type === contentType)
  }

  const trendingList = filterByType(rawTrending)
  const newReleasesList = filterByType(rawNewReleases)
  const recommendedList = filterByType(rawRecommended)

  // Dedicated Movies and Natok subsets (used when viewing 'All')
  const allMoviesList = rawTrending
    .concat(rawNewReleases)
    .filter((item: any, idx, arr) => (item.content_type === 'movie' || !item.content_type) && arr.findIndex((x) => x.id === item.id) === idx)

  const allNatokList = rawTrending
    .concat(rawNewReleases)
    .filter((item: any, idx, arr) => item.content_type === 'natok' && arr.findIndex((x) => x.id === item.id) === idx)

  // Compute 3-5 top items for Featured Hero Banner
  const combinedRaw = interleaveMovies(rawTrending, rawNewReleases)
  const filteredCombined = filterByType(combinedRaw)
  const featuredList = filteredCombined.slice(0, 5)

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
      toast.success('Saved to watchlist')
    } catch {
      toast.error('Failed to save')
    }
  }

  const hasContent =
    featuredList.length > 0 ||
    trendingList.length > 0 ||
    newReleasesList.length > 0 ||
    recommendedList.length > 0

  return (
    <div
      className="min-h-screen bg-[#0D0D0D] text-white"
      style={{
        paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 16px))',
      }}
    >
      {/* ── STICKY TOP APP BAR & NAVIGATION ── */}
      <div className="sticky top-0 z-40 bg-[#0D0D0D]/95 backdrop-blur-md border-b border-[#1A1A2E]/80">
        {/* Row 1: Brand Logo + Action Buttons */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
          {/* Brand */}
          <Link href="/" className="flex items-baseline gap-0.5 select-none active:opacity-80 transition-opacity">
            <span className="text-[#7C3AED] font-black text-2xl tracking-tight">Play</span>
            <span className="text-white font-black text-2xl tracking-tight">Nexa</span>
          </Link>

          {/* Actions: Notifications & Refresh */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNotificationsClick}
              className="w-11 h-11 rounded-full bg-[#141424] border border-[#24243B] flex items-center justify-center text-[#9CA3AF] hover:text-white hover:border-[#7C3AED]/50 active:scale-95 transition-all shadow-sm"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`w-11 h-11 rounded-full bg-[#141424] border border-[#24243B] flex items-center justify-center text-[#9CA3AF] hover:text-white hover:border-[#7C3AED]/50 active:scale-95 transition-all shadow-sm ${
                isRefreshing ? 'text-[#7C3AED]' : ''
              }`}
              aria-label="Refresh feed"
            >
              <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Row 2: Dedicated Full-Width Search Bar */}
        <div className="px-4 pb-3">
          <Link
            href="/movies/search"
            className="w-full h-12 px-4 rounded-2xl bg-[#141424] border border-[#24243B] flex items-center gap-3 text-[#9CA3AF] hover:border-[#7C3AED]/60 hover:text-white active:scale-[0.99] transition-all shadow-inner"
            aria-label="Search movies, natok, actors"
          >
            <Search size={18} className="text-[#7C3AED] flex-shrink-0" />
            <span className="text-sm font-normal text-[#8E8EA0] truncate">
              Search movies, natok, actors...
            </span>
          </Link>
        </div>

        {/* Row 3: Segmented Content Filter (All | Movies | Natok) */}
        <div className="flex gap-2.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {(
            [
              { id: 'all', label: 'All', icon: Sparkles },
              { id: 'movie', label: 'Movies', icon: Film },
              { id: 'natok', label: 'Natok', icon: Tv },
            ] as const
          ).map((tab) => {
            const active = contentType === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setContentType(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap active:scale-95 transition-all ${
                  active
                    ? 'bg-[#7C3AED] text-white shadow-[0_2px_12px_rgba(124,58,237,0.35)]'
                    : 'bg-[#141424] text-[#8E8EA0] border border-[#24243B] hover:text-white hover:border-[#2D2D44]'
                }`}
                aria-pressed={active}
              >
                <Icon size={14} className={active ? 'text-white' : 'text-[#8E8EA0]'} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      {isLoading ? (
        /* Loading Skeletons */
        <div className="pt-4 space-y-7 animate-pulse">
          {/* Featured Hero skeleton */}
          <div className="px-4">
            <div className="w-full aspect-video bg-[#141424] rounded-2xl border border-[#24243B]" />
          </div>

          {/* Row 1 skeleton */}
          <div className="px-4 space-y-3">
            <div className="h-5 bg-[#141424] rounded-lg w-36" />
            <div className="flex gap-3 overflow-hidden">
              <div className="w-[210px] aspect-video bg-[#141424] rounded-2xl flex-shrink-0" />
              <div className="w-[210px] aspect-video bg-[#141424] rounded-2xl flex-shrink-0" />
            </div>
          </div>

          {/* Row 2 skeleton */}
          <div className="px-4 space-y-3">
            <div className="h-5 bg-[#141424] rounded-lg w-44" />
            <div className="flex gap-3 overflow-hidden">
              <div className="w-[210px] aspect-video bg-[#141424] rounded-2xl flex-shrink-0" />
              <div className="w-[210px] aspect-video bg-[#141424] rounded-2xl flex-shrink-0" />
            </div>
          </div>
        </div>
      ) : !hasContent ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#141424] border border-[#24243B] flex items-center justify-center mb-4 text-[#7C3AED]">
            <Search size={28} />
          </div>
          <p className="text-white font-bold text-lg mb-1">
            {contentType === 'natok'
              ? 'No Natok Available'
              : contentType === 'movie'
              ? 'No Movies Available'
              : 'No Content Found'}
          </p>
          <p className="text-[#8E8EA0] text-xs max-w-xs leading-relaxed">
            Content added to the library will automatically show up in your feed.
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-5 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-xl active:scale-95 transition-all shadow-md"
          >
            Refresh Feed
          </button>
        </div>
      ) : (
        /* Populated Feed */
        <div className="pt-4 space-y-7">
          {/* 1. CINEMATIC FEATURED HERO SECTION */}
          {featuredList.length > 0 && (
            <section aria-label="Featured content">
              <FeaturedHeroCard
                items={featuredList}
                userId={userId}
                onSave={handleSaveFromBanner}
              />
            </section>
          )}

          {/* 2. TRENDING NOW SECTION */}
          {trendingList.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-[#7C3AED]/20 text-[#7C3AED]">
                    <Flame size={16} />
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {contentType === 'natok'
                      ? 'Trending Natok'
                      : contentType === 'movie'
                      ? 'Trending Movies'
                      : 'Trending Now'}
                  </h2>
                </div>
              </div>

              <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
                {trendingList.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    showTypeBadge={contentType === 'all'}
                    onPress={() => router.push(`/movies/${item.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 3. DEDICATED MOVIES SECTION (When filter is 'All') */}
          {contentType === 'all' && allMoviesList.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-[#7C3AED]/20 text-[#7C3AED]">
                    <Film size={16} />
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Movies
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setContentType('movie')}
                  className="text-xs font-semibold text-[#7C3AED] hover:underline"
                >
                  See all
                </button>
              </div>

              <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
                {allMoviesList.slice(0, 15).map((item) => (
                  <MediaCard
                    key={`movie-${item.id}`}
                    item={item}
                    showTypeBadge={false}
                    onPress={() => router.push(`/movies/${item.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 4. DEDICATED NATOK SECTION (When filter is 'All') */}
          {contentType === 'all' && allNatokList.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-[#06B6D4]/20 text-[#06B6D4]">
                    <Tv size={16} />
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Bangla Natok
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setContentType('natok')}
                  className="text-xs font-semibold text-[#06B6D4] hover:underline"
                >
                  See all
                </button>
              </div>

              <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
                {allNatokList.slice(0, 15).map((item) => (
                  <MediaCard
                    key={`natok-${item.id}`}
                    item={item}
                    showTypeBadge={false}
                    onPress={() => router.push(`/movies/${item.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 5. NEW RELEASES SECTION */}
          {newReleasesList.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Sparkles size={16} />
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {contentType === 'natok'
                      ? 'New Natok Releases'
                      : contentType === 'movie'
                      ? 'New Movie Releases'
                      : 'New Releases'}
                  </h2>
                </div>
              </div>

              <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
                {newReleasesList.map((item) => (
                  <MediaCard
                    key={`new-${item.id}`}
                    item={item}
                    showTypeBadge={contentType === 'all'}
                    onPress={() => router.push(`/movies/${item.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 6. RECOMMENDED FOR YOU SECTION */}
          {recommendedList.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-violet-500/20 text-violet-400">
                    <Compass size={16} />
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {contentType === 'natok'
                      ? 'Popular Natok Drama'
                      : contentType === 'movie'
                      ? 'Recommended Movies'
                      : 'Recommended for You'}
                  </h2>
                </div>
              </div>

              <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
                {recommendedList.map((item) => (
                  <MediaCard
                    key={`rec-${item.id}`}
                    item={item}
                    showTypeBadge={contentType === 'all'}
                    onPress={() => router.push(`/movies/${item.id}`)}
                  />
                ))}
              </div>
            </section>
          )}
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

