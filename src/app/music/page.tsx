'use client';
import { useRef, useCallback, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, RefreshCw, Music,
  Play, Pause, SkipBack, SkipForward,
} from 'lucide-react'
import { useAudioPlayer } from
  '@/hooks/useAudioPlayer'
import type { LocalTrack } from
  '@/hooks/useAudioPlayer'
import {
  saveAudioFiles,
  loadAudioFiles,
  clearAudioFiles,
} from '@/lib/fileStore'

// ── Styles OUTSIDE render ─────────────────
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#0D0D0D',
  paddingBottom: 160,
  fontFamily: 'system-ui, sans-serif',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '16px 12px 12px',
  position: 'sticky',
  top: 0,
  zIndex: 40,
  backgroundColor: '#0D0D0D',
  borderBottom: '1px solid #1A1A2E',
}

const backBtnStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  flexShrink: 0,
}

const refreshBtnStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  backgroundColor: '#7C3AED',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  border: 'none',
  flexShrink: 0,
}

const emptyWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 80,
  paddingBottom: 80,
  paddingLeft: 32,
  paddingRight: 32,
}

const emptyIconStyle: React.CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: '50%',
  backgroundColor: '#1A1A2E',
  border: '2px solid #2D2D44',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 24,
}

const selectBtnStyle: React.CSSProperties = {
  paddingLeft: 32,
  paddingRight: 32,
  height: 48,
  backgroundColor: '#7C3AED',
  borderRadius: 14,
  color: '#FFFFFF',
  fontWeight: 600,
  fontSize: 14,
  fontFamily: 'system-ui, sans-serif',
  border: 'none',
  cursor: 'pointer',
}

const errorBoxStyle: React.CSSProperties = {
  backgroundColor: '#1A1A2E',
  border: '1px solid #EF4444',
  borderLeft: '3px solid #EF4444',
  borderRadius: 12,
  padding: '10px 14px',
  marginBottom: 12,
}

const trackListStyle: React.CSSProperties = {
  padding: '16px 16px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  contentVisibility: 'auto' as const,
}

const playerOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 80,
  backgroundColor: '#0B0B1E',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'system-ui, sans-serif',
}

const playerHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  flexShrink: 0,
}

const artStyle: React.CSSProperties = {
  width: 240,
  height: 240,
  borderRadius: '50%',
  backgroundColor: '#1A1A2E',
  border: '4px solid #2D2D44',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 32,
}

const seekWrapStyle: React.CSSProperties = {
  padding: '0 24px',
  marginBottom: 16,
  flexShrink: 0,
}

const seekTrackStyle: React.CSSProperties = {
  position: 'relative',
  height: 20,
  display: 'flex',
  alignItems: 'center',
  marginBottom: 4,
}

const seekBgStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  height: 3,
  backgroundColor: '#2D2D44',
  borderRadius: 999,
}

const seekTimeRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
}

const seekTimeStyle: React.CSSProperties = {
  color: '#6B7280',
  fontSize: 11,
  fontFamily: 'system-ui, sans-serif',
}

const controlsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 24,
  paddingBottom: 32,
  flexShrink: 0,
}

const miniPlayerStyle: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 64,
  zIndex: 50,
  backgroundColor: '#141420',
  borderTop: '1px solid #2D2D44',
}

const miniRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '0 16px',
  height: 64,
  cursor: 'pointer',
}

export default function OfflineMusicPage() {
  const router = useRouter()
  const fileInputRef =
    useRef<HTMLInputElement>(null)
  const [showPlayer, setShowPlayer] =
    useState(false)
  const [isNativeApp, setIsNativeApp] = useState(false)

  const {
    tracks,
    currentTrack,
    currentIndex,
    isPlaying,
    isLoading,
    error,
    currentTime,
    duration,
    progress,
    toggle,
    seek,
    nextTrack,
    prevTrack,
    playAt,
    loadTracks,
    formatTime,
  } = useAudioPlayer()

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      setIsNativeApp(true)
    }
  }, [])

  useEffect(() => {
    const loadSaved = async () => {
      try {
        const saved = await loadAudioFiles()
        if (saved && saved.length > 0) {
          const loadedTracks: LocalTrack[] = saved
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((sf) => ({
              id: sf.id,
              uri: typeof window !== 'undefined' && sf.file instanceof Blob ? URL.createObjectURL(sf.file) : '',
              title: sf.name.replace(/\.[^/.]+$/, ''),
              artist: 'Device Music',
              fileName: sf.name,
              file: sf.file,
              size: sf.size,
            }))
          loadTracks(loadedTracks, 0)
        }
      } catch (err) {
        console.error('Failed to load saved audio files:', err)
      }
    }
    loadSaved()
  }, [loadTracks])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (!files.length) return

      const audioExts = [
        'mp3', 'm4a', 'aac', 'ogg',
        'wav', 'flac', 'opus',
      ]
      const audioFiles = files.filter(f => {
        const ext = f.name.split('.').pop()
          ?.toLowerCase()
        return audioExts.includes(ext || '') ||
          f.type.startsWith('audio/')
      })

      if (!audioFiles.length) return

      try {
        // Save to IndexedDB for persistence
        await saveAudioFiles(audioFiles)

        // Merge with existing saved files
        const existing = await loadAudioFiles()
        const loadedTracks: LocalTrack[] = existing
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((sf) => ({
            id: sf.id,
            title: sf.name.replace(/\.[^/.]+$/, ''),
            artist: 'Device Music',
            fileName: sf.name,
            uri: typeof window !== 'undefined' && sf.file instanceof Blob ? URL.createObjectURL(sf.file) : '',
            size: sf.size,
            file: sf.file,
          }))

        loadTracks(loadedTracks, 0)
        setShowPlayer(true)
      } catch (err) {
        console.error('Failed to save/process selected audio files:', err)
      }
      e.target.value = ''
    },
    [loadTracks]
  )

  const handleNativeScan = async () => {
    try {
      fileInputRef.current?.click()
    } catch {
      fileInputRef.current?.click()
    }
  }

  const handleTrackPress = (idx: number) => {
    playAt(idx)
    setShowPlayer(true)
  }

  const formatSize = (bytes: number): string => {
    if (bytes > 1024 * 1024)
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  return (
    <div style={pageStyle}>

      {/* Header */}
      <div style={headerStyle}>
        <button
          onClick={() => router.back()}
          style={backBtnStyle}
          className="active:opacity-60"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
            margin: 0,
          }}>
            Device Music
          </h1>
          <p style={{
            color: '#9CA3AF',
            fontSize: 12,
            fontFamily: 'system-ui, sans-serif',
            marginTop: 2,
          }}>
            {tracks.length > 0
              ? `${tracks.length} songs loaded`
              : 'Select audio files to play'}
          </p>
        </div>
        {tracks.length > 0 && (
          <button
            onClick={async () => {
              await clearAudioFiles()
              loadTracks([], 0)
            }}
            className="active:opacity-60"
            style={{
              padding: '6px 14px',
              backgroundColor: '#1A1A2E',
              border: '1px solid #2D2D44',
              borderRadius: 10,
              color: '#9CA3AF',
              fontSize: 12,
              fontFamily: 'system-ui, sans-serif',
              cursor: 'pointer',
              marginRight: 4,
            }}
          >
            Clear All
          </button>
        )}
        <button
          onClick={() =>
            fileInputRef.current?.click()}
          style={refreshBtnStyle}
          className="active:opacity-60"
        >
          <RefreshCw size={16} color="#FFFFFF" />
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.ogg,.wav,.flac,.opus"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Empty state */}
      {tracks.length === 0 && (
        <div style={emptyWrapStyle}>
          <div style={emptyIconStyle}>
            <Music size={36} color="#7C3AED" />
          </div>
          <h2 style={{
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 18,
            fontFamily: 'system-ui, sans-serif',
            marginBottom: 8,
          }}>
            No offline songs
          </h2>
          <p style={{
            color: '#9CA3AF',
            fontSize: 14,
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 1.5,
          }}>
            Pick audio files from your device.
            All files stay 100% local and private.
          </p>
          {isNativeApp ? (
            <button
              onClick={handleNativeScan}
              className="active:opacity-80"
              style={{
                width: '100%',
                maxWidth: 280,
                height: 48,
                backgroundColor: '#7C3AED',
                borderRadius: 14,
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 14,
                fontFamily: 'system-ui, sans-serif',
                border: 'none',
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              Scan Device Music
            </button>
          ) : (
            <button
              onClick={() =>
                fileInputRef.current?.click()}
              style={selectBtnStyle}
              className="active:opacity-60"
            >
              Browse Audio Files
            </button>
          )}
        </div>
      )}

      {/* Error display */}
      {error && tracks.length > 0 && (
        <div style={{
          ...errorBoxStyle,
          margin: '8px 16px',
        }}>
          <p style={{
            color: '#EF4444',
            fontSize: 13,
            fontFamily: 'system-ui, sans-serif',
            margin: 0,
          }}>
            {error}
          </p>
          <p style={{
            color: '#6B7280',
            fontSize: 11,
            fontFamily: 'system-ui, sans-serif',
            marginTop: 3,
          }}>
            Tap another song or try again
          </p>
        </div>
      )}

      {/* Track list */}
      {tracks.length > 0 && (
        <div style={trackListStyle}>
          {tracks.map((track, idx) => {
            const isActive = currentIndex === idx
            return (
              <button
                key={track.id}
                onClick={() =>
                  handleTrackPress(idx)}
                className="active:opacity-60"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderRadius: 14,
                  border: `1px solid ${
                    isActive
                      ? 'rgba(124,58,237,0.4)'
                      : '#2D2D44'}`,
                  backgroundColor: isActive
                    ? 'rgba(124,58,237,0.1)'
                    : '#1A1A2E',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: isActive
                    ? '#7C3AED' : '#0D0D0D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isActive && isPlaying ? (
                    <Pause size={18}
                      color="#FFFFFF"
                      fill="#FFFFFF" />
                  ) : (
                    <Music size={18}
                      color={isActive
                        ? '#FFFFFF' : '#7C3AED'} />
                  )}
                </div>
                <div style={{
                  flex: 1,
                  minWidth: 0,
                }}>
                  <p style={{
                    color: isActive
                      ? '#A78BFA' : '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily:
                      'system-ui, sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                  }}>
                    {track.title}
                  </p>
                  <p style={{
                    color: '#6B7280',
                    fontSize: 11,
                    fontFamily:
                      'system-ui, sans-serif',
                    marginTop: 2,
                  }}>
                    {formatSize(
                      (track as any).size || 0)}
                  </p>
                </div>
                {isActive && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 2,
                    height: 16,
                    flexShrink: 0,
                  }}>
                    {[60, 100, 40].map((h, i) => (
                      <div key={i} style={{
                        width: 2,
                        borderRadius: 999,
                        backgroundColor: '#7C3AED',
                        height: isPlaying
                          ? `${h}%` : '30%',
                      }} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Full Player Overlay */}
      {showPlayer && currentTrack && (
        <div style={playerOverlayStyle}>

          {/* Player header */}
          <div style={playerHeaderStyle}>
            <button
              onClick={() => setShowPlayer(false)}
              style={backBtnStyle}
              className="active:opacity-60"
            >
              <ChevronLeft size={22}
                color="#FFFFFF" />
            </button>
            <p style={{
              color: '#9CA3AF',
              fontSize: 12,
              fontFamily: 'system-ui, sans-serif',
            }}>
              {currentIndex + 1} of{' '}
              {tracks.length}
            </p>
            <div style={{ width: 40 }} />
          </div>

          {/* Album art + info */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 32px',
          }}>
            <div style={artStyle}>
              <Music size={64} color="#7C3AED" />
            </div>
            <p style={{
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 20,
              fontFamily: 'system-ui, sans-serif',
              textAlign: 'center',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              lineHeight: 1.3,
              marginBottom: 6,
              width: '100%',
            }}>
              {currentTrack.title}
            </p>
            <p style={{
              color: '#9CA3AF',
              fontSize: 14,
              fontFamily: 'system-ui, sans-serif',
            }}>
              Local File
            </p>

            {/* Error in player */}
            {error && (
              <div style={{
                ...errorBoxStyle,
                marginTop: 16,
                width: '100%',
              }}>
                <p style={{
                  color: '#EF4444',
                  fontSize: 12,
                  fontFamily:
                    'system-ui, sans-serif',
                  margin: 0,
                  textAlign: 'center',
                }}>
                  {error}
                </p>
              </div>
            )}
          </div>

          {/* Seekbar */}
          <div style={seekWrapStyle}>
            <div style={seekTrackStyle}>
              {/* Background */}
              <div style={seekBgStyle} />
              {/* Fill */}
              <div style={{
                position: 'absolute',
                left: 0,
                height: 3,
                backgroundColor: '#7C3AED',
                borderRadius: 999,
                width: `${progress}%`,
                pointerEvents: 'none',
                transition: 'width 0.3s linear',
              }} />
              {/* Thumb */}
              <div style={{
                position: 'absolute',
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                left: `${progress}%`,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                zIndex: 2,
              }} />
              {/* Invisible input for drag */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                step={0.5}
                onChange={e =>
                  seek(parseFloat(e.target.value))}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 3,
                  margin: 0,
                }}
              />
            </div>
            <div style={seekTimeRowStyle}>
              <span style={seekTimeStyle}>
                {formatTime(currentTime)}
              </span>
              <span style={seekTimeStyle}>
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div style={controlsStyle}>
            <button
              onClick={prevTrack}
              style={backBtnStyle}
              className="active:opacity-60"
            >
              <SkipBack size={28}
                color="#FFFFFF" />
            </button>
            <button
              onClick={toggle}
              disabled={isLoading}
              className="active:opacity-60"
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: '#7C3AED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              {isLoading ? (
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#FFFFFF',
                  animation: 'pn-spin 0.7s linear infinite',
                }} />
              ) : isPlaying ? (
                <Pause size={28}
                  color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Play size={28}
                  color="#FFFFFF" fill="#FFFFFF" />
              )}
            </button>
            <button
              onClick={nextTrack}
              style={backBtnStyle}
              className="active:opacity-60"
            >
              <SkipForward size={28}
                color="#FFFFFF" />
            </button>
          </div>
        </div>
      )}

      {/* Mini Player */}
      {currentTrack && !showPlayer && (
        <div style={miniPlayerStyle}>
          {/* Progress line */}
          <div style={{
            height: 2,
            backgroundColor: '#2D2D44',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: '#7C3AED',
            }} />
          </div>
          <div
            onClick={() => setShowPlayer(true)}
            style={miniRowStyle}
            className="active:opacity-60"
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: 'rgba(124,58,237,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Music size={18} color="#7C3AED" />
            </div>
            <div style={{
              flex: 1,
              minWidth: 0,
            }}>
              <p style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'system-ui, sans-serif',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
              }}>
                {currentTrack.title}
              </p>
              <p style={{
                color: '#9CA3AF',
                fontSize: 11,
                fontFamily: 'system-ui, sans-serif',
                marginTop: 1,
              }}>
                Local File
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <button
                onClick={e => {
                  e.stopPropagation()
                  toggle()
                }}
                className="active:opacity-60"
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {isPlaying
                  ? <Pause size={20}
                      color="#FFFFFF" />
                  : <Play size={20}
                      color="#FFFFFF" />}
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  nextTrack()
                }}
                className="active:opacity-60"
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <SkipForward size={20}
                  color="#FFFFFF" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
