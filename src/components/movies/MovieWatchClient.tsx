'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import YouTubePlayer from '@/components/movies/YoutubePlayer'
import ActionBar from '@/components/movies/ActionBar'
import SkeletonCard from '@/components/ui/SkeletonCard'
import { broadcastStop } from '@/lib/audioCoordinator'

const subscribeBtnStyle: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  border: 'none',
  cursor: 'pointer',
  flexShrink: 0,
}

const recommendationsListStyle: React.CSSProperties = {
  contentVisibility: 'auto',
}

interface MovieWatchClientProps {
  id: string
  initialMovie?: any
}

export default function MovieWatchClient({ id, initialMovie }: MovieWatchClientProps) {
  const router = useRouter()
  const [movie, setMovie] = useState<any>(initialMovie || null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [channelVideoCount, setChannelVideoCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [userState, setUserState] = useState({
    liked: false,
    saved: false,
    reaction: null as string | null,
  })
  const [subscribed, setSubscribed] = useState(false)
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const [bookmarkTime, setBookmarkTime] = useState<number | null>(null)
  const [startAt, setStartAt] = useState<number | null>(null)
  const [channelVideos, setChannelVideos] = useState<any[]>([])
  const [currentVideoIndex, setCurrentVideoIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(!initialMovie)

  useEffect(() => {
    // Stop any playing audio when movie starts
    broadcastStop('movie')
    return () => {}
  }, [id])

  // Get Firebase user
  useEffect(() => {
    import('@/lib/firebase').then(({ auth }) => {
      const { onAuthStateChanged } = require('firebase/auth')
      const unsub = onAuthStateChanged(auth, (user: any) => {
        setUserId(user?.uid || null)
      })
      return () => unsub()
    })
  }, [])

  // Load movie data + recommendations
  useEffect(() => {
    if (!id) return

    // If initialMovie was already provided server-side, use it immediately
    if (initialMovie) {
      setMovie(initialMovie)
      setIsLoading(false)

      // Check bookmark immediately
      const savedBookmark = localStorage.getItem(`pn_bookmark_${id}`)
      if (savedBookmark) {
        const time = parseInt(savedBookmark)
        if (time > 30) {
          setBookmarkTime(time)
          setShowResumeBanner(true)
        }
      }

      // Record watch history
      if (userId && initialMovie.youtube_id) {
        fetch('/api/movies/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            movieId: id,
            youtubeId: initialMovie.youtube_id,
          }),
        }).catch(() => {})
      }
    }

    const load = async () => {
      // Only show full loading skeleton if movie is not already available
      if (!initialMovie && !movie) setIsLoading(true)
      try {
        const url = `/api/movies/detail?id=${id}${userId ? `&userId=${userId}` : ''}`
        const res = await fetch(url)
        const data = await res.json()

        if (data.movie && !initialMovie) {
          setMovie(data.movie)

          // Check bookmark
          const savedBookmark = localStorage.getItem(`pn_bookmark_${id}`)
          if (savedBookmark) {
            const time = parseInt(savedBookmark)
            if (time > 30) {
              setBookmarkTime(time)
              setShowResumeBanner(true)
            }
          }

          // Record watch history
          if (userId) {
            fetch('/api/movies/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                movieId: id,
                youtubeId: data.movie.youtube_id,
              }),
            }).catch(() => {})
          }
        }

        if (data.recommendations) {
          setRecommendations(data.recommendations)
        }
        if (data.channelVideoCount !== undefined) {
          setChannelVideoCount(data.channelVideoCount)
        }
        if (data.userState) {
          setUserState(data.userState)
          setSubscribed(!!data.userState.subscribed)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, userId, initialMovie])

  // Load channel videos for autoplay next
  useEffect(() => {
    if (!movie?.channel_id) return
    const loadChannel = async () => {
      try {
        const res = await fetch(`/api/movies/channel/${movie.channel_id}`)
        const data = await res.json()
        if (data.movies) {
          setChannelVideos(data.movies)
          const idx = data.movies.findIndex((m: any) => m.id === id)
          setCurrentVideoIndex(idx)
        }
      } catch {}
    }
    loadChannel()
  }, [movie?.channel_id, id])

  const handleEnded = () => {
    localStorage.removeItem(`pn_bookmark_${id}`)
    if (channelVideos.length > 0 && currentVideoIndex >= 0) {
      const nextIdx = currentVideoIndex + 1
      if (nextIdx < channelVideos.length) {
        const nextMovie = channelVideos[nextIdx]
        router.push(`/movies/${nextMovie.id}`)
        return
      }
    }
    if (recommendations.length > 0) {
      router.push(`/movies/${recommendations[0].id}`)
    }
  }

  const handleProgress = (seconds: number) => {
    if (seconds > 10) {
      try {
        localStorage.setItem(`pn_bookmark_${id}`, Math.floor(seconds).toString())
      } catch {}
    }
  }

  const handleSubscribe = async () => {
    if (!userId) {
      router.push('/auth/login')
      return
    }
    const newSubState = !subscribed
    setSubscribed(newSubState)
    try {
      await fetch('/api/movies/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          userId,
          channelId: movie.channel_id,
          channelName: movie.channel_name,
        }),
      })
    } catch {
      setSubscribed(!newSubState)
    }
  }

  const formatProgressTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  if (isLoading || !movie) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white">
        <div className="sticky top-0 z-50 bg-[#0D0D0D] border-b border-[#1A1A2E] px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#1A1A2E] flex items-center justify-center active:opacity-60 transition-opacity duration-150"
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </button>
          <div className="h-4 bg-[#1A1A2E] rounded-lg w-1/3" />
        </div>
        <div className="w-full aspect-video bg-[#1A1A2E]" />
        <div className="p-4 space-y-4">
          <div className="h-6 bg-[#1A1A2E] rounded-lg w-3/4" />
          <div className="h-4 bg-[#1A1A2E] rounded-lg w-1/4" />
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-[#1A1A2E] rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[#1A1A2E] rounded-lg w-1/3" />
              <div className="h-3 bg-[#1A1A2E] rounded-lg w-1/4" />
            </div>
          </div>
          <div className="pt-6">
            <div className="h-5 bg-[#1A1A2E] rounded-lg w-1/3 mb-3" />
            <div className="space-y-3">
              <SkeletonCard variant="row" count={3} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white pb-24">
      {/* Top Back Bar */}
      <div className="sticky top-0 z-50 bg-[#0D0D0D] border-b border-[#1A1A2E] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#1A1A2E] flex items-center justify-center active:opacity-60 transition-opacity duration-150"
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </button>
        <p className="text-white text-sm font-semibold truncate flex-1">
          {movie.title}
        </p>
      </div>

      {/* YouTube Player */}
      <div className="w-full aspect-video bg-black sticky top-[65px] z-40">
        <YouTubePlayer
          youtubeId={movie.youtube_id}
          title={movie.title}
          startAt={startAt || 0}
          onEnded={handleEnded}
          onProgress={handleProgress}
        />

        {/* Resume Watch Banner */}
        {showResumeBanner && bookmarkTime && (
          <div className="absolute top-3 left-3 right-3 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl p-3 flex items-center justify-between z-50">
            <p className="text-white text-xs">
              Resume watching from {formatProgressTime(bookmarkTime)}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setStartAt(bookmarkTime)
                  setShowResumeBanner(false)
                }}
                className="px-3 py-1 bg-[#7C3AED] text-white text-xs font-semibold rounded-lg active:opacity-60 transition-all duration-150"
              >
                Resume
              </button>
              <button
                onClick={() => {
                  setShowResumeBanner(false)
                  setStartAt(null)
                  localStorage.removeItem('pn_bookmark_' + id)
                }}
                className="px-3 py-1 bg-[#2D2D44] text-[#9CA3AF] text-xs font-semibold rounded-lg active:opacity-60 transition-all duration-150"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Movie Info */}
      <div className="px-4 py-4">
        {/* Title */}
        <h1 className="text-white font-bold text-lg leading-tight mb-2">
          {movie.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <span className="text-[#9CA3AF] text-sm">
            {(movie.watch_count || 0) > 1000
              ? `${((movie.watch_count || 0) / 1000).toFixed(1)}K`
              : movie.watch_count || 0} views
          </span>
          {movie.content_type === 'natok' && (
            <span
              style={{
                backgroundColor: '#06B6D4',
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'system-ui, sans-serif',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              Natok
            </span>
          )}
          {movie.genre?.length > 0 && (
            <>
              <span className="text-[#2D2D44]">•</span>
              <span className="text-[#9CA3AF] text-sm">{movie.genre[0]}</span>
            </>
          )}
        </div>

        {/* Action Bar */}
        <ActionBar
          movieId={id}
          youtubeId={movie.youtube_id}
          title={movie.title}
          thumbnail={movie.thumbnail}
          userId={userId}
          initialLiked={userState.liked}
          initialSaved={userState.saved}
          initialReaction={userState.reaction}
          channelId={movie.channel_id}
          channelName={movie.channel_name}
        />

        {/* Channel Row */}
        <div className="flex items-center gap-3 py-4 border-t border-b border-[#1A1A2E] mt-4">
          <div className="w-10 h-10 rounded-full bg-[#1A1A2E] overflow-hidden flex-shrink-0">
            <img
              src={`https://unavatar.io/youtube/${movie.channel_id}`}
              alt={movie.channel_name}
              loading="lazy"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">
              {movie.channel_name}
            </p>
            {channelVideoCount > 0 && (
              <p
                style={{
                  color: '#9CA3AF',
                  fontSize: 11,
                  fontFamily: 'system-ui, sans-serif',
                  marginTop: 2,
                }}
              >
                {channelVideoCount} videos
              </p>
            )}
          </div>
          <button
            onClick={handleSubscribe}
            style={subscribeBtnStyle}
            className={`px-4 py-2 rounded-full text-sm font-semibold min-h-[36px] active:opacity-60 transition-all duration-150 ${
              subscribed
                ? 'bg-[#1A1A2E] text-[#9CA3AF] border border-[#2D2D44]'
                : 'bg-white text-black'
            }`}
          >
            {subscribed ? 'Subscribed' : 'Subscribe'}
          </button>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-6">
            <h2 className="text-base font-bold text-white mb-3">
              {movie.content_type === 'natok' ? 'More Natok' : 'More Like This'}
            </h2>
            <div className="space-y-3" style={recommendationsListStyle}>
              {recommendations.map((m: any) => (
                <Link
                  key={m.id}
                  href={`/movies/${m.id}`}
                  className="w-full flex gap-3 active:opacity-60 transition-opacity duration-150 text-left block"
                  style={{ textDecoration: 'none' }}
                >
                  <img
                    src={m.thumbnail}
                    alt={m.title}
                    loading="lazy"
                    width={160}
                    height={90}
                    className="w-40 aspect-video object-cover rounded-xl bg-[#1A1A2E] flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-white text-sm font-medium line-clamp-2 leading-tight">
                      {m.title}
                    </p>
                    <p className="text-[#9CA3AF] text-xs mt-1 truncate">
                      {m.channel_name}
                    </p>
                    {m.content_type === 'natok' && (
                      <span
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#06B6D4',
                          color: '#FFFFFF',
                          fontSize: 9,
                          fontWeight: 700,
                          fontFamily: 'system-ui, sans-serif',
                          padding: '1px 6px',
                          borderRadius: 999,
                          marginTop: 2,
                        }}
                      >
                        Natok
                      </span>
                    )}
                    <p className="text-[#6B7280] text-xs mt-0.5">
                      {m.watch_count || 0} views
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
