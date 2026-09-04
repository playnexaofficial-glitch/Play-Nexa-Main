'use client'

import { useState, useEffect, useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Play, Film, Tv, Sparkles, Search } from 'lucide-react'
import { getByChannel } from '@/lib/search'
import MediaCard from '@/components/home/MediaCard'
import { Movie } from '@/components/movies/MovieCard'

export default function ChannelClient({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const rawId = decodeURIComponent(id)

  const [videos, setVideos] = useState<Movie[]>([])
  const [channelName, setChannelName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'all' | 'movie' | 'natok'>('all')

  useEffect(() => {
    let isMounted = true
    const loadChannelData = async () => {
      setLoading(true)
      try {
        // 1. First attempt: Query feed API with channel id/param
        const res = await fetch(`/api/movies/feed?channel=${encodeURIComponent(rawId)}`)
        if (res.ok) {
          const data = await res.json()
          const combined: Movie[] = [
            ...(data.featured || []),
            ...(data.trending || []),
            ...(data.newReleases || []),
            ...(data.recommended || []),
          ]

          // Deduplicate by ID
          const seen = new Set<string>()
          const unique: Movie[] = []
          for (const item of combined) {
            if (item && item.id && !seen.has(item.id)) {
              seen.add(item.id)
              unique.push(item)
            }
          }

          if (unique.length > 0 && isMounted) {
            setVideos(unique)
            setChannelName(unique[0].channel_name || rawId)
            setLoading(false)
            return
          }
        }

        // 2. Second attempt: Search by channel name / id if feed returned empty
        const searchRes = await fetch(`/api/movies/search?q=${encodeURIComponent(rawId)}`)
        if (searchRes.ok) {
          const sData = await searchRes.json()
          if (sData.results && sData.results.length > 0 && isMounted) {
            setVideos(sData.results)
            setChannelName(sData.results[0].channel_name || rawId)
            setLoading(false)
            return
          }
        }

        // 3. Fallback to local catalog
        const local = getByChannel(rawId)
        if (local.length > 0 && isMounted) {
          const mapped: Movie[] = local.map((v) => ({
            id: v.id,
            youtube_id: v.videoId,
            title: v.title,
            thumbnail: v.thumbnail,
            channel_name: v.channel,
            duration: v.duration,
            view_count: (v as any).view_count || (v as any).views || 0,
          }))
          setVideos(mapped)
          setChannelName(local[0].channel || rawId)
        } else if (isMounted) {
          setChannelName(rawId.startsWith('UC') ? 'Official Channel' : rawId)
        }
      } catch (err) {
        console.error('Failed to load channel data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadChannelData()
    return () => {
      isMounted = false
    }
  }, [rawId])

  // Determine if channel actually has both types
  const hasMovies = useMemo(() => {
    return videos.some((v: any) => v.content_type === 'movie' || !v.content_type)
  }, [videos])

  const hasNatok = useMemo(() => {
    return videos.some((v: any) => v.content_type === 'natok')
  }, [videos])

  const showFilterTabs = hasMovies && hasNatok

  const filteredVideos = useMemo(() => {
    if (!showFilterTabs || selectedTab === 'all') return videos
    if (selectedTab === 'natok') {
      return videos.filter((v: any) => v.content_type === 'natok')
    }
    return videos.filter((v: any) => v.content_type === 'movie' || !v.content_type)
  }, [videos, selectedTab, showFilterTabs])

  const avatarLetter = (channelName || rawId || 'P').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 select-none">
      {/* Channel Header Banner */}
      <div className="relative">
        {/* Cinematic Backdrop / Banner */}
        <div className="h-36 sm:h-44 w-full bg-gradient-to-r from-purple-950 via-zinc-900 to-indigo-950 relative overflow-hidden border-b border-zinc-800/80">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-black/60" />
        </div>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          type="button"
          className="absolute top-4 left-4 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full p-2.5 active:scale-95 transition-all duration-150 min-h-[44px] min-w-[44px] flex items-center justify-center border border-zinc-700/60 shadow-lg backdrop-blur-md z-20"
          aria-label="Go back"
        >
          <ChevronLeft size={20} />
        </button>

        {/* PlayNexa Brand Pill */}
        <div className="absolute top-4 right-4 bg-zinc-900/80 border border-zinc-700/60 rounded-full px-3 py-1 backdrop-blur-md z-20">
          <p className="text-[11px] font-black tracking-wider text-purple-400">
            PLAY<span className="text-white">NEXA</span>
          </p>
        </div>

        {/* Channel Avatar Overlay */}
        <div className="absolute -bottom-9 left-4 z-20">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-zinc-950 bg-zinc-900 overflow-hidden shadow-xl flex items-center justify-center text-white font-black text-2xl relative">
            <img
              src={`https://unavatar.io/youtube/${rawId}`}
              alt={channelName}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to stylized letter avatar
                ;(e.target as HTMLElement).style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center font-black text-white text-xl">
              {avatarLetter}
            </div>
          </div>
        </div>
      </div>

      {/* Channel Info Section */}
      <div className="pt-12 px-4 pb-3">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {channelName || rawId}
          </h1>
        </div>
        <p className="text-zinc-400 text-xs mt-1">
          YouTube Sourced Creator • Verified on PlayNexa
        </p>

        {/* Real Stats Badge */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Film size={14} className="text-purple-400" />
            <span className="font-bold text-white">{videos.length}</span>
            <span className="text-zinc-400">videos</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Play size={14} className="text-emerald-400" />
            <span className="text-zinc-400">Free HD streaming</span>
          </div>
        </div>
      </div>

      {/* Optional Content Type Filter Tabs (Only if channel has BOTH Movies and Natok) */}
      {showFilterTabs && (
        <div className="flex items-center gap-2 px-4 py-2 border-y border-zinc-900 bg-zinc-950/80 sticky top-0 z-30 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setSelectedTab('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-all ${
              selectedTab === 'all'
                ? 'bg-white text-zinc-950 font-bold shadow-sm'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            All ({videos.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('movie')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-all ${
              selectedTab === 'movie'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Movies
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('natok')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-all ${
              selectedTab === 'natok'
                ? 'bg-cyan-500 text-zinc-950 font-black shadow-sm'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Natok
          </button>
        </div>
      )}

      {/* Videos List Grid */}
      <div className="px-4 pt-4">
        <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">
          Channel Content ({filteredVideos.length})
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <div className="w-full aspect-video bg-zinc-900 rounded-xl" />
                <div className="h-4 bg-zinc-900 rounded w-3/4" />
                <div className="h-3 bg-zinc-900 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Search size={24} />
            </div>
            <p className="text-white font-bold">No videos available</p>
            <p className="text-zinc-500 text-xs">
              Check back soon for new releases from this channel.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {filteredVideos.map((video) => (
              <MediaCard
                key={video.id}
                item={video}
                customWidthClass="w-full"
                showTypeBadge={selectedTab === 'all'}
                onPress={() => router.push(`/movies/${video.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
