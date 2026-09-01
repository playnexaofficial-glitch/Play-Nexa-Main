'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

// ── Static style declarations OUTSIDE the render function ──
const pageContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#0D0D0D',
  paddingBottom: 96,
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '16px 16px 8px',
  position: 'sticky',
  top: 0,
  zIndex: 40,
  backgroundColor: '#0D0D0D',
}

const backBtnStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  backgroundColor: '#1A1A2E',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'opacity 150ms ease',
}

const headerTitleStyle: React.CSSProperties = {
  color: '#FFFFFF',
  fontWeight: 700,
  fontSize: 18,
  fontFamily: 'system-ui, sans-serif',
}

const headerSubStyle: React.CSSProperties = {
  color: '#9CA3AF',
  fontSize: 12,
  fontFamily: 'system-ui, sans-serif',
}

const avatarContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  padding: '16px 0 24px',
}

const avatarImgStyle: React.CSSProperties = {
  width: 80,
  height: 80,
  borderRadius: '50%',
  border: '3px solid #7C3AED',
  backgroundColor: '#1A1A2E',
  objectFit: 'cover' as const,
}

const trackListStyle: React.CSSProperties = {
  padding: '0 16px',
  contentVisibility: 'auto' as const,
}

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  paddingTop: 60,
}

const emptyTextStyle: React.CSSProperties = {
  color: '#9CA3AF',
  fontFamily: 'system-ui, sans-serif',
}

const trackImgStyle: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 8,
  objectFit: 'cover' as const,
  backgroundColor: '#1A1A2E',
  flexShrink: 0,
}

const trackTitleStyle: React.CSSProperties = {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: 500,
  fontFamily: 'system-ui, sans-serif',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const trackChannelStyle: React.CSSProperties = {
  color: '#9CA3AF',
  fontSize: 12,
  fontFamily: 'system-ui, sans-serif',
}

export default function YTMusicChannelClient(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = use(params)
  const router = useRouter()
  const [tracks, setTracks] = useState<any[]>([])
  const [channelName, setChannelName] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/ytmusic/channel?id=${id}`)
        const data = await res.json()
        if (data && data.tracks) {
          if (data.tracks.length > 0) {
            setChannelName(data.tracks[0].channel_name)
          }
          setTracks(data.tracks)
        }
      } catch (err) {
        console.error('Failed to load channel tracks:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  return (
    <div style={pageContainerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button
          onClick={() => router.back()}
          style={backBtnStyle}
          className="active:opacity-60"
        >
          <ChevronLeft size={20} color="#FFFFFF" />
        </button>
        <div>
          <h1 style={headerTitleStyle}>
            {channelName || 'Channel'}
          </h1>
          <p style={headerSubStyle}>
            {tracks.length} tracks
          </p>
        </div>
      </div>

      {/* Channel avatar */}
      <div style={avatarContainerStyle}>
        <img
          src={`https://unavatar.io/youtube/${id}`}
          alt={channelName}
          loading="lazy"
          width={80}
          height={80}
          style={avatarImgStyle}
        />
      </div>

      {/* Track list */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '3px solid #2D2D44',
            borderTopColor: '#7C3AED',
            animation: 'pn-spin 0.7s linear infinite',
          }} />
        </div>
      ) : tracks.length === 0 ? (
        <div style={emptyStateStyle}>
          <p style={emptyTextStyle}>No tracks found</p>
        </div>
      ) : (
        <div style={trackListStyle}>
          {tracks.map((track, i) => {
            const itemStyle: React.CSSProperties = {
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0',
              cursor: 'pointer',
              borderBottom: i < tracks.length - 1 ? '1px solid #1A1A2E' : 'none',
              transition: 'opacity 150ms ease',
            }

            return (
              <div
                key={track.id}
                onClick={() => {
                  localStorage.setItem('pn_play_track', JSON.stringify(track))
                  router.push('/ytmusic')
                }}
                style={itemStyle}
                className="active:opacity-60"
              >
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  loading="lazy"
                  width={52}
                  height={52}
                  style={trackImgStyle}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={trackTitleStyle}>
                    {track.title}
                  </p>
                  <p style={trackChannelStyle}>
                    {track.channel_name}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
