'use client'

import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react'

export interface Track {
  id: string
  youtube_id: string
  title: string
  thumbnail: string
  channel_name: string
}

interface YTPlayerCtx {
  currentTrack: Track | null
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  loadTrack: (t: Track) => void
  clearTrack: () => void
}

const Ctx = createContext<YTPlayerCtx | null>(null)

export function useYTPlayer() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useYTPlayer outside provider')
  return c
}

export function YTPlayerProvider({
  children,
}: {
  children: ReactNode
}) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const loadTrack = useCallback((t: Track) => {
    setCurrentTrack(t)
  }, [])

  const clearTrack = useCallback(() => {
    setCurrentTrack(null)
  }, [])

  return (
    <Ctx.Provider value={{
      currentTrack, iframeRef,
      loadTrack, clearTrack,
    }}>
      {children}

      {/* Persistent iframe — lives in layout,
          NEVER unmounts on tab switch */}
      {currentTrack && (
        <iframe
          ref={iframeRef}
          key={currentTrack.youtube_id}
          src={
            `https://www.youtube.com/embed/` +
            `${currentTrack.youtube_id}` +
            `?autoplay=1&controls=0` +
            `&enablejsapi=1&modestbranding=1` +
            `&rel=0&playsinline=1`
          }
          allow="autoplay; encrypted-media"
          title={currentTrack.title}
          onLoad={() => {
            setTimeout(() => {
              iframeRef.current
                ?.contentWindow
                ?.postMessage(
                  JSON.stringify({
                    event: 'listening', id: 1
                  }), '*'
                )
            }, 800)
          }}
          style={{
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0,
            border: 'none',
            pointerEvents: 'none',
          }}
        />
      )}
    </Ctx.Provider>
  )
}
