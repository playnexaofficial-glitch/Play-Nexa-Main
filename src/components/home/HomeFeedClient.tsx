'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Bell, RefreshCw, Flame, Film, Tv, Sparkles, Compass, CheckCircle2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import FeaturedHeroCard from '@/components/home/FeaturedHeroCard'
import MediaCard from '@/components/home/MediaCard'
import { Movie } from '@/components/movies/MovieCard'

type FilterCategory = 'all' | 'movie' | 'natok' | 'trending'

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

function deduplicateList(items: Movie[]): Movie[] {
  const seen = new Set<string>()
  const list: Movie[] = []
  for (const item of items) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id)
      list.push(item)
    }
  }
  return list
}

export default function HomeFeedClient() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [rawTrending, setRawTrending] = useState<Movie[]>([])
  const [rawNewReleases, setRawNewReleases] = useState<Movie[]>([])
  const [rawRecommended, setRawRecommended] = useState<Movie[]>([])
  const [channelMovies, setChannelMovies] = useState<Movie[]>([])
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Infinite Scroll Pagination State
  const INITIAL_BATCH_SIZE = 16
  const BATCH_INCREMENT = 12
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

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

  const fetchFeed = useCallback(
    async (filter: FilterCategory, isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      // Reset pagination when fetching fresh feed or switching categories
      setVisibleCount(INITIAL_BATCH_SIZE)

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 12000)

        const typeParam = filter === 'all' || filter === 'trending' ? 'all' : filter
        const res = await fetch(`/api/movies/feed?type=${typeParam}`, {
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

        const chMovies: Movie[] =
          data.channelSections?.flatMap((s: any) => s.movies || []) || []

        setRawTrending(trending)
        setRawNewReleases(newReleases)
        setRawRecommended(recommended)
        setChannelMovies(chMovies)

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
    },
    []
  )

  // Fetch when filter category changes
  useEffect(() => {
    fetchFeed(selectedFilter, false)
  }, [selectedFilter, fetchFeed])

  const handleRefresh = () => {
    fetchFeed(selectedFilter, true)
  }

  const handleNotificationsClick = () => {
    toast.info('Notifications', {
      description: 'You are all caught up! No unread notifications.',
    })
  }

  // Filter content by selected category chip
  const filterBySelectedChip = useCallback(
    (list: Movie[]) => {
      if (selectedFilter === 'all') return list
      if (selectedFilter === 'trending') return list
      return list.filter((item: any) => item.content_type === selectedFilter)
    },
    [selectedFilter]
  )

  const trendingList = useMemo(() => {
    return filterBySelectedChip(rawTrending)
  }, [filterBySelectedChip, rawTrending])

  const newReleasesList = useMemo(() => {
    return filterBySelectedChip(rawNewReleases)
  }, [filterBySelectedChip, rawNewReleases])

  const recommendedList = useMemo(() => {
    return filterBySelectedChip(rawRecommended)
  }, [filterBySelectedChip, rawRecommended])

  // Dedicated Movies and Natok subsets (used when viewing 'all')
  const allMoviesList = useMemo(() => {
    return rawTrending
      .concat(rawNewReleases)
      .concat(channelMovies)
      .filter(
        (item: any, idx, arr) =>
          (item.content_type === 'movie' || !item.content_type) &&
          arr.findIndex((x) => x.id === item.id) === idx
      )
  }, [rawTrending, rawNewReleases, channelMovies])

  const allNatokList = useMemo(() => {
    return rawTrending
      .concat(rawNewReleases)
      .concat(channelMovies)
      .filter(
        (item: any, idx, arr) =>
          item.content_type === 'natok' &&
          arr.findIndex((x) => x.id === item.id) === idx
      )
  }, [rawTrending, rawNewReleases, channelMovies])

  // Compute 3-5 top items for Featured Hero Banner
  const combinedRaw = useMemo(() => {
    return interleaveMovies(rawTrending, rawNewReleases)
  }, [rawTrending, rawNewReleases])

  const featuredList = useMemo(() => {
    const filtered = filterBySelectedChip(combinedRaw)
    return filtered.slice(0, 5)
  }, [filterBySelectedChip, combinedRaw])

  // Aggregate full content pool for the Infinite Continuous Feed
  const fullContentPool = useMemo(() => {
    const rawAll = [
      ...rawRecommended,
      ...rawNewReleases,
      ...rawTrending,
      ...channelMovies,
    ]
    const filtered = filterBySelectedChip(rawAll)
    return deduplicateList(filtered)
  }, [rawRecommended, rawNewReleases, rawTrending, channelMovies, filterBySelectedChip])

  // Items currently sliced for the infinite feed
  const infiniteFeedItems = useMemo(() => {
    return fullContentPool.slice(0, visibleCount)
  }, [fullContentPool, visibleCount])

  const hasMore = visibleCount < fullContentPool.length

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true)
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, fullContentPool.length))
            setIsLoadingMore(false)
          }, 250)
        }
      },
      { rootMargin: '400px 0px', threshold: 0.1 }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoading, isLoadingMore, fullContentPool.length])

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
    recommendedList.length > 0 ||
    fullContentPool.length > 0

  const filterChips: { id: FilterCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'movie', label: 'Movie' },
    { id: 'natok', label: 'Natok' },
    { id: 'trending', label: 'Trending' },
  ]

  return (
    <div
      className="min-h-screen bg-zinc-950 text-white select-none"
      style={{
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 16px))',
      }}
    >
      {/* ── 1. TOP NAVIGATION BAR ── */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left Side: PlayNexa Brand Logo */}
          <Link href="/" className="flex items-center gap-1.5 active:opacity-80 transition-opacity">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-purple-500">
              Play<span className="text-white">Nexa</span>
            </span>
          </Link>

          {/* Right Side: Circular Search Icon & Notification Bell */}
          <div className="flex items-center gap-2">
            {/* Circular Search Icon Button */}
            <Link
              href="/movies/search"
              className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-300 hover:text-white hover:border-purple-500/50 active:scale-95 transition-all shadow-sm"
              aria-label="Search content"
            >
              <Search size={18} />
            </Link>

            {/* Notification Bell Icon with Active Badge */}
            <button
              type="button"
              onClick={handleNotificationsClick}
              className="relative w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-300 hover:text-white hover:border-purple-500/50 active:scale-95 transition-all shadow-sm"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {/* Active Badge */}
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-purple-500 ring-2 ring-zinc-950 shadow-[0_0_6px_#a855f7]" />
            </button>

            {/* Quick Refresh Icon */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-white hover:border-purple-500/50 active:scale-95 transition-all shadow-sm ${
                isRefreshing ? 'text-purple-400' : ''
              }`}
              aria-label="Refresh feed"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── 2. CATEGORY FILTER CHIPS (Horizontal Scrollable Bar) ── */}
        <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide border-t border-zinc-900/60">
          {filterChips.map((chip) => {
            const active = selectedFilter === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedFilter(chip.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap active:scale-95 transition-all duration-150 ${
                  active
                    ? 'bg-white text-zinc-950 shadow-md font-bold'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700/50 hover:bg-zinc-700/70 hover:text-white'
                }`}
                aria-pressed={active}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* ── 3. MAIN CONTENT AREA ── */}
      {isLoading ? (
        /* 60fps Lightweight Skeleton Screen */
        <div className="pt-4 space-y-6 animate-pulse">
          {/* Featured Hero skeleton */}
          <div className="px-4">
            <div className="w-full aspect-video bg-zinc-900 rounded-xl sm:rounded-2xl border border-zinc-800/80" />
          </div>

          {/* Row 1 skeleton */}
          <div className="px-4 space-y-3">
            <div className="h-5 bg-zinc-900 rounded-md w-36" />
            <div className="flex gap-3 overflow-hidden">
              <div className="w-[210px] aspect-video bg-zinc-900 rounded-xl flex-shrink-0" />
              <div className="w-[210px] aspect-video bg-zinc-900 rounded-xl flex-shrink-0" />
            </div>
          </div>

          {/* Row 2 skeleton */}
          <div className="px-4 space-y-3">
            <div className="h-5 bg-zinc-900 rounded-md w-44" />
            <div className="flex gap-3 overflow-hidden">
              <div className="w-[210px] aspect-video bg-zinc-900 rounded-xl flex-shrink-0" />
              <div className="w-[210px] aspect-video bg-zinc-900 rounded-xl flex-shrink-0" />
            </div>
          </div>
        </div>
      ) : !hasContent ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-purple-400">
            <Search size={28} />
          </div>
          <p className="text-white font-bold text-lg mb-1">
            {selectedFilter === 'natok'
              ? 'No Natok Available'
              : selectedFilter === 'movie'
              ? 'No Movies Available'
              : selectedFilter === 'trending'
              ? 'No Trending Content Available'
              : 'No Content Found'}
          </p>
          <p className="text-zinc-400 text-xs max-w-xs leading-relaxed">
            Content added to the library will automatically show up in your feed.
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-5 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl active:scale-95 transition-all shadow-md"
          >
            Refresh Feed
          </button>
        </div>
      ) : (
        /* Populated Feed */
        <div className="pt-3.5 space-y-7">
          {/* 3. HERO FEATURED CARD (Top of Content) */}
          {featuredList.length > 0 && (
            <section aria-label="Featured content">
              <FeaturedHeroCard
                items={featuredList}
                userId={userId}
                onSave={handleSaveFromBanner}
              />
            </section>
          )}

          {/* 4. TRENDING NOW SECTION (Horizontal Scroll) */}
          {trendingList.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-purple-600/20 text-purple-400">
                    <Flame size={16} />
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {selectedFilter === 'natok'
                      ? 'Trending Natok'
                      : selectedFilter === 'movie'
                      ? 'Trending Movies'
                      : 'Trending Now'}
                  </h2>
                </div>
              </div>

              <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
                {trendingList.map((item) => (
                  <MediaCard
                    key={`trend-${item.id}`}
                    item={item}
                    showTypeBadge={selectedFilter === 'all'}
                    onPress={() => router.push(`/movies/${item.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 5. DEDICATED MOVIES SECTION (When filter is 'all') */}
          {selectedFilter === 'all' && allMoviesList.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-purple-600/20 text-purple-400">
                    <Film size={16} />
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Popular Movies
                  </h2>
                </div>
                <Link
                  href="/movies"
                  className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5 transition-colors"
                >
                  <span>See all</span>
                  <ChevronRight size={14} />
                </Link>
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

          {/* 6. DEDICATED BANGLA NATOK SECTION (When filter is 'all') */}
          {selectedFilter === 'all' && allNatokList.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Tv size={16} />
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Bangla Natok
                  </h2>
                </div>
                <Link
                  href="/natok"
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 transition-colors"
                >
                  <span>See all</span>
                  <ChevronRight size={14} />
                </Link>
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

          {/* 7. NEW RELEASES SECTION (Horizontal Scroll) */}
          {selectedFilter !== 'trending' && newReleasesList.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Sparkles size={16} />
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {selectedFilter === 'natok'
                      ? 'New Natok Releases'
                      : selectedFilter === 'movie'
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
                    showTypeBadge={selectedFilter === 'all'}
                    onPress={() => router.push(`/movies/${item.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 8. INFINITE CONTINUOUS DISCOVERY FEED WITH 'FEW VIDEOS THEN LARGE VIDEO' FEATURE */}
          {infiniteFeedItems.length > 0 && (
            <section className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-violet-500/20 text-violet-400">
                    <Compass size={16} />
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {selectedFilter === 'natok'
                      ? 'Explore Natok Dramas'
                      : selectedFilter === 'movie'
                      ? 'Explore Movies'
                      : 'Discover More'}
                  </h2>
                </div>
              </div>

              {/* Rhythmic 2-column mobile grid with every 5th item presented as a Large Card (Master Prompt Section 50/51) */}
              <div className="grid grid-cols-2 gap-3.5 px-4">
                {infiniteFeedItems.map((item, index) => {
                  const isLargeCard = index % 5 === 4

                  if (isLargeCard) {
                    return (
                      <div key={`feed-${item.id}`} className="col-span-2 py-1">
                        <MediaCard
                          item={item}
                          variant="large"
                          showTypeBadge={selectedFilter === 'all'}
                          onPress={() => router.push(`/movies/${item.id}`)}
                        />
                      </div>
                    )
                  }

                  return (
                    <div key={`feed-${item.id}`} className="col-span-1">
                      <MediaCard
                        item={item}
                        customWidthClass="w-full"
                        showTypeBadge={selectedFilter === 'all'}
                        onPress={() => router.push(`/movies/${item.id}`)}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Infinite Scroll Trigger Sentinel */}
              <div ref={sentinelRef} className="h-6 w-full" />

              {/* Loading More Indicator */}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-6 gap-2 text-purple-400">
                  <RefreshCw size={18} className="animate-spin" />
                  <span className="text-xs font-semibold text-zinc-400">Loading more videos...</span>
                </div>
              )}

              {/* End of Feed Indicator */}
              {!hasMore && infiniteFeedItems.length > 0 && (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-2">
                    <CheckCircle2 size={18} className="text-purple-400" />
                  </div>
                  <p className="text-zinc-300 text-xs font-semibold">
                    You&apos;ve reached the end
                  </p>
                  <p className="text-zinc-500 text-[11px] mt-0.5">
                    Check back soon for new releases and updates.
                  </p>
                </div>
              )}
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
