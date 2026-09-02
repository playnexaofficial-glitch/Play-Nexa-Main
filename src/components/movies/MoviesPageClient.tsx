'use client'
import { useState, useEffect, useRef }
  from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import FeaturedBanner from
  '@/components/movies/FeaturedBanner'
import MovieCard from
  '@/components/movies/MovieCard'
import SkeletonCard from
  '@/components/ui/SkeletonCard'

// ── Styles outside render ─────────────────
const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 16px 0',
  position: 'sticky',
  top: 0,
  zIndex: 40,
  backgroundColor: '#0D0D0D',
}

const h1Style: React.CSSProperties = {
  color: '#FFFFFF',
  fontSize: 22,
  fontWeight: 800,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  margin: 0,
}

const searchBtnStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  backgroundColor: '#1A1A2E',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
}

const tabRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: '10px 16px 4px',
  backgroundColor: '#0D0D0D',
}

const chipRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  overflowX: 'auto',
  padding: '6px 16px 8px',
  backgroundColor: '#0D0D0D',
}

const sectionTitleStyle: React.CSSProperties = {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'system-ui, sans-serif',
  marginBottom: 12,
  margin: '0 0 12px 0',
}

const sectionSubStyle: React.CSSProperties = {
  color: '#9CA3AF',
  fontSize: 12,
  fontFamily: 'system-ui, sans-serif',
  marginBottom: 12,
  margin: '2px 0 12px 0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const rowScrollStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  overflowX: 'auto',
  paddingBottom: 8,
  contentVisibility: 'auto',
  containIntrinsicSize: '0 200px',
}

const cwThumbStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 160,
  cursor: 'pointer',
}

const cwImgWrapStyle: React.CSSProperties = {
  position: 'relative',
  borderRadius: 10,
  overflow: 'hidden',
  backgroundColor: '#1A1A2E',
}

const cwTitleStyle: React.CSSProperties = {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: 500,
  fontFamily: 'system-ui, sans-serif',
  marginTop: 6,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const progressTrackStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 3,
  backgroundColor: '#2D2D44',
}

const seeAllStyle: React.CSSProperties = {
  color: '#7C3AED',
  fontSize: 12,
  fontFamily: 'system-ui, sans-serif',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
}

const emptyWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 80,
  paddingBottom: 80,
}

const emptyIconStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 18,
  backgroundColor: '#1A1A2E',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,
}

// ── Component ─────────────────────────────
export default function MoviesPageClient() {
  const router = useRouter()
  const [userId, setUserId] =
    useState<string | null>(null)
  const [feed, setFeed] = useState<any>({
    featured: [],
    trending: [],
    newReleases: [],
    channelSections: [],
    channels: [],
    continueWatching: [],
    recommended: [],
    becauseYouWatched: null,
  })
  const [selectedChannel, setSelectedChannel] =
    useState('all')
  const [contentType, setContentType] =
    useState<'all' | 'movie' | 'natok'>('all')
  const [isLoading, setIsLoading] =
    useState(true)
  const [bannerIndex, setBannerIndex] =
    useState(0)
  const bannerRef =
    useRef<NodeJS.Timeout>(undefined)

  // Get Firebase user
  useEffect(() => {
    import('@/lib/firebase').then(({ auth }) => {
      const { onAuthStateChanged } =
        require('firebase/auth')
      const unsub = onAuthStateChanged(
        auth, (user: any) => {
          setUserId(user?.uid || null)
        })
      return () => unsub()
    })
  }, [])

  // Load feed
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(
          () => controller.abort(), 12000)
        const params = new URLSearchParams()
        if (userId)
          params.set('userId', userId)
        if (selectedChannel !== 'all')
          params.set('channel', selectedChannel)
        if (contentType !== 'all')
          params.set('type', contentType)
        const res = await fetch(
          `/api/movies/feed?${params}`,
          { signal: controller.signal }
        )
        clearTimeout(timeoutId)
        if (!res.ok) throw new Error(
          `HTTP ${res.status}`)
        const data = await res.json()
        if (!data.error) setFeed(data)
        else throw new Error(data.error)
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.warn('Movies feed timeout')
        }
        // Don't throw — show empty state instead
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [userId, selectedChannel, contentType])

  // Banner auto-rotate
  useEffect(() => {
    if (feed.featured.length <= 1) return
    bannerRef.current = setInterval(() => {
      setBannerIndex(i =>
        (i + 1) % feed.featured.length)
    }, 5000)
    return () => {
      if (bannerRef.current)
        clearInterval(bannerRef.current)
    }
  }, [feed.featured.length])

  const handleSaveFromBanner = async (
    movieId: string
  ) => {
    if (!userId) {
      router.push('/auth/login')
      return
    }
    try {
      await fetch('/api/movies/react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'save',
          userId,
          movieId,
          youtubeId: feed.featured
            .find((m: any) => m.id === movieId)
            ?.youtube_id || '',
        }),
      })
    } catch {}
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] pb-24">
        {/* Header skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 0' }}>
          <div className="h-6 bg-[#1A1A2E] rounded-lg w-1/3" />
          <div className="w-10 h-10 bg-[#1A1A2E] rounded-full" />
        </div>
        {/* Tab row skeleton */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px 4px' }}>
          <div className="h-8 bg-[#1A1A2E] rounded-full w-16" />
          <div className="h-8 bg-[#1A1A2E] rounded-full w-20" />
          <div className="h-8 bg-[#1A1A2E] rounded-full w-20" />
        </div>
        {/* Chip row skeleton */}
        <div style={{ display: 'flex', gap: 8, padding: '6px 16px 8px' }}>
          <div className="h-8 bg-[#1A1A2E] rounded-full w-12" />
          <div className="h-8 bg-[#1A1A2E] rounded-full w-24" />
          <div className="h-8 bg-[#1A1A2E] rounded-full w-28" />
        </div>
        {/* Banner placeholder */}
        <div style={{ marginBottom: 24 }}>
          <div className="relative w-full aspect-video bg-[#1A1A2E]" />
        </div>
        {/* Section row placeholders */}
        <div className="px-4 space-y-6">
          <div>
            <div className="h-5 bg-[#1A1A2E] rounded-lg w-1/4 mb-3" />
            <div className="flex gap-3 overflow-x-hidden">
              <SkeletonCard variant="portrait" count={3} />
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
    )
  }

  const hasContent =
    feed.featured.length > 0 ||
    feed.trending.length > 0 ||
    feed.newReleases.length > 0 ||
    feed.channelSections.length > 0

  const typeLabel =
    contentType === 'movie' ? 'Movies'
    : contentType === 'natok' ? 'Natok'
    : 'Movies & Natok'

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0D0D0D',
      paddingBottom: 96,
    }}>

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backgroundColor: '#0D0D0D',
      }}>

        {/* Title + Search */}
        <div style={headerStyle}>
          <h1 style={h1Style}>{typeLabel}</h1>
          <button
            onClick={() =>
              router.push('/movies/search')}
            style={searchBtnStyle}
            className="active:opacity-60"
          >
            <Search size={18} color="#FFFFFF" />
          </button>
        </div>

        {/* All / Movie / Natok tabs */}
        <div style={tabRowStyle}>
          {(
            [
              { id: 'all',   label: 'All' },
              { id: 'movie', label: 'Movie' },
              { id: 'natok', label: 'Natok' },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() =>
                setContentType(tab.id)}
              className="active:opacity-60"
              style={{
                padding: '7px 22px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                fontFamily:
                  'system-ui, sans-serif',
                backgroundColor:
                  contentType === tab.id
                    ? '#7C3AED'
                    : '#1A1A2E',
                color:
                  contentType === tab.id
                    ? '#FFFFFF'
                    : '#9CA3AF',
                transition: 'opacity 150ms',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Channel filter chips */}
        {feed.channels.length > 0 && (
          <div style={chipRowStyle}
            className="hide-scroll">
            <button
              onClick={() =>
                setSelectedChannel('all')}
              className="active:opacity-60"
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                minHeight: 34,
                fontSize: 13,
                fontWeight: 500,
                fontFamily:
                  'system-ui, sans-serif',
                backgroundColor:
                  selectedChannel === 'all'
                    ? '#FFFFFF' : '#1A1A2E',
                color:
                  selectedChannel === 'all'
                    ? '#000000' : '#9CA3AF',
                transition: 'opacity 150ms',
              }}
            >
              All
            </button>
            {feed.channels.map((ch: any) => (
              <button
                key={ch.id}
                onClick={() =>
                  setSelectedChannel(ch.id)}
                className="active:opacity-60"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                  padding: '6px 14px 6px 8px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  minHeight: 34,
                  backgroundColor:
                    selectedChannel === ch.id
                      ? '#FFFFFF' : '#1A1A2E',
                  color:
                    selectedChannel === ch.id
                      ? '#000000' : '#9CA3AF',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily:
                    'system-ui, sans-serif',
                  transition: 'opacity 150ms',
                }}
              >
                <img
                  src={`https://unavatar.io/youtube/${ch.id}`}
                  alt=""
                  loading="lazy"
                  width={20}
                  height={20}
                  style={{
                    borderRadius: '50%',
                    backgroundColor: '#2D2D44',
                    flexShrink: 0,
                    objectFit: 'cover',
                  }}
                />
                {ch.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Featured Banner ── */}
      {feed.featured.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <FeaturedBanner
            movies={feed.featured}
            currentIndex={bannerIndex}
            onIndexChange={setBannerIndex}
            onPlay={id =>
              router.push(`/movies/${id}`)}
            onSave={handleSaveFromBanner}
          />
        </div>
      )}

      {/* ── All sections ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        padding: '0 16px',
      }}>

        {/* Continue Watching */}
        {feed.continueWatching?.length > 0 && (
          <section>
            <h2 style={sectionTitleStyle}>
              Continue Watching
            </h2>
            <div style={rowScrollStyle}
              className="hide-scroll">
              {feed.continueWatching.map(
                (m: any) => (
                <div
                  key={m.id}
                  onClick={() =>
                    router.push(`/movies/${m.id}`)}
                  style={cwThumbStyle}
                >
                  <div style={cwImgWrapStyle}>
                    <img
                      src={m.thumbnail}
                      alt={m.title}
                      loading="lazy"
                      width={160}
                      height={90}
                      style={{
                        width: '100%',
                        height: 90,
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <div
                      style={progressTrackStyle}>
                      <div style={{
                        height: '100%',
                        width:
                          `${m.watchPercent || 0}%`,
                        backgroundColor: '#7C3AED',
                      }} />
                    </div>
                  </div>
                  <p style={cwTitleStyle}>
                    {m.title}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trending Now */}
        {feed.trending?.length > 0 && (
          <section>
            <h2 style={sectionTitleStyle}>
              Trending Now
            </h2>
            <div style={rowScrollStyle}
              className="hide-scroll">
              {feed.trending.map((m: any) => (
                <MovieCard
                  key={m.id}
                  movie={m}
                  variant="portrait"
                  onPress={() =>
                    router.push(`/movies/${m.id}`)
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* New Releases */}
        {feed.newReleases?.length > 0 && (
          <section>
            <h2 style={sectionTitleStyle}>
              New Releases
            </h2>
            <div style={rowScrollStyle}
              className="hide-scroll">
              {feed.newReleases.map((m: any) => (
                <MovieCard
                  key={m.id}
                  movie={m}
                  variant="portrait"
                  onPress={() =>
                    router.push(`/movies/${m.id}`)
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* Because You Watched */}
        {feed.becauseYouWatched && (
          <section>
            <h2 style={sectionTitleStyle}>
              Because You Watched
            </h2>
            <p style={sectionSubStyle}>
              {feed.becauseYouWatched.basedOn}
            </p>
            <div style={rowScrollStyle}
              className="hide-scroll">
              {feed.becauseYouWatched.movies
                .map((m: any) => (
                <MovieCard
                  key={m.id}
                  movie={m}
                  variant="portrait"
                  onPress={() =>
                    router.push(`/movies/${m.id}`)
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* Recommended For You */}
        {feed.recommended?.length > 0 && (
          <section>
            <h2 style={sectionTitleStyle}>
              Recommended For You
            </h2>
            <div style={rowScrollStyle}
              className="hide-scroll">
              {feed.recommended.map((m: any) => (
                <MovieCard
                  key={m.id}
                  movie={m}
                  variant="portrait"
                  onPress={() =>
                    router.push(`/movies/${m.id}`)
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* Channel Sections */}
        {feed.channelSections?.map(
          (sec: any) => (
          <section key={sec.channelId}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <h2 style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: 700,
                fontFamily:
                  'system-ui, sans-serif',
                margin: 0,
              }}>
                {sec.channelName}
              </h2>
              <button
                onClick={() =>
                  setSelectedChannel(
                    sec.channelId)}
                style={seeAllStyle}
              >
                See all
              </button>
            </div>
            <div style={rowScrollStyle}
              className="hide-scroll">
              {sec.movies.map((m: any) => (
                <MovieCard
                  key={m.id}
                  movie={m}
                  variant="landscape"
                  onPress={() =>
                    router.push(`/movies/${m.id}`)
                  }
                />
              ))}
            </div>
          </section>
        ))}

        {/* Empty state */}
        {!hasContent && (
          <div style={emptyWrapStyle}>
            <div style={emptyIconStyle}>
              <Search size={28}
                color="#6B7280" />
            </div>
            <p style={{
              color: '#FFFFFF',
              fontWeight: 600,
              fontFamily:
                'system-ui, sans-serif',
              margin: 0,
            }}>
              {contentType === 'natok'
                ? 'No natok yet'
                : 'No movies yet'}
            </p>
            <p style={{
              color: '#9CA3AF',
              fontSize: 13,
              fontFamily:
                'system-ui, sans-serif',
              marginTop: 6,
              textAlign: 'center',
              maxWidth: 240,
            }}>
              Add channels from Admin Panel
              to populate your library
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
