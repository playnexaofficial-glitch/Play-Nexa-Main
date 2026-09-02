'use client'
import { useState, useEffect, useCallback }
  from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Bell } from 'lucide-react'
import { useMusicContext, type MusicTrack } from '@/context/MusicContext'
import dynamic from 'next/dynamic'
const FullPlayer = dynamic(() => import('@/components/ytmusic/FullPlayer'), { ssr: false })
import MiniPlayer from
  '@/components/ytmusic/MiniPlayer'
import TrackCard from
  '@/components/ytmusic/TrackCard'
import TrackRow from
  '@/components/ytmusic/TrackRow'
import MoodChips from
  '@/components/ytmusic/MoodChips'
import SkeletonCard from '@/components/ui/SkeletonCard'

// Mood/filter definitions — NO emojis
const MOODS = [
  { id: 'all', label: 'All' },
  { id: 'hot', label: 'Hot' },
  { id: 'new', label: 'New' },
  { id: 'bangla', label: 'Bangla' },
  { id: 'hindi', label: 'Hindi' },
  { id: 'happy', label: 'Happy' },
  { id: 'sad', label: 'Sad' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'lofi', label: 'Lofi' },
  { id: 'remix', label: 'Remix' },
]

export default function YTMusicPageClient() {
  const router = useRouter()
  const [userId, setUserId] = useState<
    string | null>(null)
  const [feed, setFeed] = useState<any>({
    quickPicks: [], topChannels: [],
    channelRows: [],
    newReleases: [], recommended: [],
    recentlyPlayed: [],
  })
  const [allTracks, setAllTracks] = useState<
    MusicTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMood, setSelectedMood] =
    useState('all')
  const [showPlayer, setShowPlayer] =
    useState(false)

  const {
    currentTrack,
    queue,
    currentIndex,
    shuffleMode,
    repeatMode,
    playTrack,
    nextTrack,
    prevTrack,
    toggleShuffle,
    toggleRepeat,
    iframeRef,
    isPlaying,
    currentTime,
    duration,
    progress,
    togglePlay,
    seek,
    formatTime,
  } = useMusicContext()

  const queueLength = queue.length

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

  // Check for search result playback
  useEffect(() => {
    const playTrackStr = localStorage.getItem('pn_play_track')
    if (playTrackStr) {
      try {
        const track = JSON.parse(playTrackStr)
        localStorage.removeItem('pn_play_track')
        if (track) {
          playTrack(track, [track, ...allTracks])
          setShowPlayer(true)
        }
      } catch (e) {}
    }
  }, [playTrack, allTracks])

  // Load feed
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (userId) params.set('userId', userId)
        if (selectedMood !== 'all')
          params.set('mood', selectedMood)

        const res = await fetch(
          `/api/ytmusic/feed?${params}`)
        const data = await res.json()

        if (!data.error) {
          setFeed(data)
          // Collect all tracks for queue building
          const all = [
            ...(data.quickPicks || []),
            ...(data.newReleases || []),
            ...(data.recommended || []),
            ...(data.recentlyPlayed || []),
            ...(data.channelRows || [])
              .flatMap((r: any) => r.tracks || []),
          ]
          const seen = new Set<string>()
          const unique: MusicTrack[] = []
          for (const t of all) {
            if (t && !seen.has(t.id)) {
              seen.add(t.id)
              unique.push(t)
            }
          }
          setAllTracks(unique)
        }
      } catch {}
      setIsLoading(false)
    }
    load()
  }, [userId, selectedMood])

  // Listen for track ended event
  useEffect(() => {
    const handler = () => nextTrack()
    window.addEventListener(
      'ytmusic:trackended', handler)
    return () => window.removeEventListener(
      'ytmusic:trackended', handler)
  }, [nextTrack])

  const handleTrackPress = useCallback(
    (track: MusicTrack) => {
      playTrack(track, allTracks)
      setShowPlayer(true)

      // Save to music_history
      if (userId) {
        fetch('/api/ytmusic/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            trackId: track.id,
            youtubeId: track.youtube_id,
          }),
        }).catch(() => {})
      }
    }, [playTrack, allTracks, userId])

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    if (h < 21) return 'Good Evening'
    return 'Good Night'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] pb-36 px-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between py-4 border-b border-[#1A1A2E] mb-4">
          <div className="space-y-1 w-1/3">
            <div className="h-5 bg-[#1A1A2E] rounded-lg w-full" />
            <div className="h-3 bg-[#1A1A2E] rounded-lg w-2/3" />
          </div>
          <div className="flex gap-2">
            <div className="w-10 h-10 bg-[#1A1A2E] rounded-full" />
            <div className="w-10 h-10 bg-[#1A1A2E] rounded-full" />
          </div>
        </div>
        {/* Mood chips placeholder */}
        <div className="flex gap-2 mb-6 overflow-hidden">
          <div className="h-8 bg-[#1A1A2E] rounded-full w-14 flex-shrink-0" />
          <div className="h-8 bg-[#1A1A2E] rounded-full w-16 flex-shrink-0" />
          <div className="h-8 bg-[#1A1A2E] rounded-full w-20 flex-shrink-0" />
          <div className="h-8 bg-[#1A1A2E] rounded-full w-16 flex-shrink-0" />
        </div>
        {/* Quick Picks row skeleton */}
        <div className="mb-6">
          <div className="h-5 bg-[#1A1A2E] rounded-lg w-1/4 mb-3" />
          <div className="flex gap-3 overflow-hidden">
            <SkeletonCard variant="portrait" count={3} />
          </div>
        </div>
        {/* Recently played rows skeleton */}
        <div>
          <div className="h-5 bg-[#1A1A2E] rounded-lg w-1/4 mb-3" />
          <div className="space-y-2">
            <SkeletonCard variant="row" count={3} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]
      pb-36">

      {/* Header */}
      <div className="flex items-center
        justify-between px-4 pt-4 pb-2
        sticky top-0 z-40 bg-[#0D0D0D]">
        <div>
          <h1 className="text-xl font-bold
            text-white">{getGreeting()}</h1>
          <p className="text-[#9CA3AF] text-xs
            mt-0.5">What would you like to listen to?
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/ytmusic/search"
            className="w-10 h-10 rounded-full
              bg-[#1A1A2E] flex items-center
              justify-center active:opacity-60">
            <Search size={18} color="#FFFFFF"/>
          </Link>
          <button
            className="w-10 h-10 rounded-full
              bg-[#1A1A2E] flex items-center
              justify-center active:opacity-60">
            <Bell size={18} color="#FFFFFF"/>
          </button>
        </div>
      </div>

      {/* Mood Chips */}
      <MoodChips
        moods={MOODS}
        selected={selectedMood}
        onChange={setSelectedMood}
      />

      {/* Sections */}
      <div className="space-y-8 px-4 mt-4">

        {/* Quick Picks */}
        {feed.quickPicks.length > 0 && (
          <section>
            <h2 className="text-base font-bold
              text-white mb-3">Quick Picks</h2>
            <div className="flex gap-3
              overflow-x-auto hide-scroll pb-2"
              style={{ contentVisibility: 'auto' }}>
              {feed.quickPicks.map(
                (t: MusicTrack) => (
                <div key={t.id} style={{ width: 120, flexShrink: 0 }}>
                  <TrackCard
                    track={t}
                    isPlaying={isPlaying &&
                      currentTrack?.id === t.id}
                    onPress={() =>
                      handleTrackPress(t)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recently Played */}
        {feed.recentlyPlayed.length > 0 && (
          <section>
            <h2 className="text-base font-bold
              text-white mb-3">Recently Played</h2>
            <div className="space-y-1"
              style={{ contentVisibility: 'auto' }}>
              {feed.recentlyPlayed.map(
                (t: MusicTrack) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  isPlaying={isPlaying &&
                    currentTrack?.id === t.id}
                  onPress={() =>
                    handleTrackPress(t)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Top Channels */}
        {feed.topChannels.length > 0 && (
          <section>
            <h2 className="text-base font-bold
              text-white mb-3">Top Channels</h2>
            <div className="flex gap-4
              overflow-x-auto hide-scroll pb-2">
              {feed.topChannels.map(
                (ch: any) => (
                <Link
                  key={ch.channel_id}
                  href={`/ytmusic/channel/${ch.channel_id}`}
                  style={{ textDecoration: 'none' }}
                  className="flex flex-col
                    items-center gap-2 flex-shrink-0
                    active:opacity-60">
                  <div className="w-14 h-14
                    rounded-full bg-[#1A1A2E]
                    overflow-hidden border-2
                    border-[#7C3AED]">
                    <img
                      src={`https://unavatar.io/` +
                        `youtube/${ch.channel_id}`}
                      alt={ch.channel_name}
                      loading="lazy"
                      className="w-full h-full
                        object-cover"
                    />
                  </div>
                  <span className="text-[10px]
                    text-[#9CA3AF] text-center
                    max-w-[60px] leading-tight
                    line-clamp-2">
                    {ch.channel_name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* New Releases */}
        {feed.newReleases.length > 0 && (
          <section>
            <h2 className="text-base font-bold
              text-white mb-3">New Releases</h2>
            <div className="flex gap-3
              overflow-x-auto hide-scroll pb-2"
              style={{ contentVisibility: 'auto', containIntrinsicSize: '0 200px' }}>
              {feed.newReleases.map(
                (t: MusicTrack) => (
                <div key={t.id} style={{ width: 120, flexShrink: 0 }}>
                  <TrackCard
                    track={t}
                    isPlaying={isPlaying &&
                      currentTrack?.id === t.id}
                    onPress={() =>
                      handleTrackPress(t)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Channel Rows */}
        {(feed.channelRows || []).map(
          (row: any) => (
          <section key={row.channelId}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <img
                  src={
                    'https://unavatar.io/' +
                    'youtube/' + row.channelId
                  }
                  alt={row.channelName}
                  loading="lazy"
                  width={28}
                  height={28}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: '#1A1A2E',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
                <h2 style={{
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily:
                    'system-ui, sans-serif',
                  margin: 0,
                }}>
                  {row.channelName}
                </h2>
              </div>
              <Link
                href={`/ytmusic/channel/${row.channelId}`}
                className="active:opacity-60"
                style={{
                  color: '#7C3AED',
                  fontSize: 12,
                  fontFamily:
                    'system-ui, sans-serif',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 0',
                  textDecoration: 'none',
                }}
              >
                See all
              </Link>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 12,
                overflowX: 'auto',
                paddingBottom: 8,
                contentVisibility: 'auto',
                containIntrinsicSize: '0 200px',
              }}
              className="hide-scroll"
            >
              {row.tracks.map(
                (t: MusicTrack) => (
                <TrackCard
                  key={t.id}
                  track={t}
                  isPlaying={
                    isPlaying &&
                    currentTrack?.id === t.id
                  }
                  onPress={() =>
                    handleTrackPress(t)}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Recommended For You */}
        {feed.recommended?.length > 0 && (
          <section>
            <h2 className="text-base font-bold
              text-white mb-3">
              Recommended For You
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              contentVisibility: 'auto',
            }}>
              {feed.recommended.map(
                (t: MusicTrack) => (
                <button
                  key={t.id}
                  onClick={() =>
                    handleTrackPress(t)}
                  className="active:opacity-60"
                  style={{
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <img
                    src={t.thumbnail}
                    alt={t.title}
                    loading="lazy"
                    width={160}
                    height={90}
                    style={{
                      width: '100%',
                      aspectRatio: '16/9',
                      objectFit: 'cover',
                      borderRadius: 10,
                      backgroundColor: '#1A1A2E',
                      display: 'block',
                      marginBottom: 8,
                    }}
                  />
                  <p style={{
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily:
                      'system-ui, sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                  }}>
                    {t.title}
                  </p>
                  <p style={{
                    color: '#9CA3AF',
                    fontSize: 11,
                    fontFamily:
                      'system-ui, sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: 2,
                  }}>
                    {t.channel_name}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!isLoading && (() => {
          const hasAnyMusic =
            feed.quickPicks.length > 0 ||
            feed.newReleases.length > 0 ||
            feed.recommended.length > 0 ||
            feed.recentlyPlayed.length > 0 ||
            (feed.channelRows || []).length > 0
          return !hasAnyMusic
        })() && (
          <div className="flex flex-col
            items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl
              bg-[#1A1A2E] flex items-center
              justify-center mb-4">
              <Search size={28} color="#6B7280"/>
            </div>
            <p className="text-white font-semibold">
              No music yet
            </p>
            <p className="text-[#9CA3AF] text-sm
              mt-1 text-center px-8">
              Add music channels from Admin Panel
              to populate your library
            </p>
          </div>
        )}
      </div>

      {/* Mini Player */}
      {currentTrack && !showPlayer && (
        <MiniPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          progress={progress}
          onTogglePlay={togglePlay}
          onNext={nextTrack}
          onExpand={() => setShowPlayer(true)}
          iframeRef={iframeRef}
          isVideoMode={false}
        />
      )}

      {/* Full Player */}
      {currentTrack && showPlayer && (
        <FullPlayer
          track={currentTrack}
          iframeRef={iframeRef}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          progress={progress}
          shuffleMode={shuffleMode}
          repeatMode={repeatMode}
          currentIndex={currentIndex}
          queueLength={queueLength}
          onTogglePlay={togglePlay}
          onNext={nextTrack}
          onPrev={prevTrack}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          onSeek={seek}
          onClose={() => setShowPlayer(false)}
          formatTime={formatTime}
          userId={userId}
          allTracks={allTracks}
        />
      )}
    </div>
  )
}
