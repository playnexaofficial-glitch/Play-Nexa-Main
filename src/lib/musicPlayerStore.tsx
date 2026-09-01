'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface Track {
  id: string
  youtube_id: string
  title: string
  thumbnail: string
  channel_name: string
}

interface MusicStore {
  currentTrack: Track | null
  isPlaying: boolean
  play: (track: Track) => void
  pause: () => void
}

const MusicStoreContext = createContext<MusicStore | null>(null)

export function MusicStoreProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const play = useCallback((track: Track) => {
    setCurrentTrack(track)
    setIsPlaying(true)
  }, [])

  const pause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  return (
    <MusicStoreContext.Provider value={{ currentTrack, isPlaying, play, pause }}>
      {children}
    </MusicStoreContext.Provider>
  )
}

export function useMusicStore() {
  const ctx = useContext(MusicStoreContext)
  if (!ctx) throw new Error('useMusicStore must be inside MusicStoreProvider')
  return ctx
}
