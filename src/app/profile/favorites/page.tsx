// src/app/profile/favorites/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Trash2, Heart } from 'lucide-react'

export default function FavoritesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [movies, setMovies] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { auth } = await import('@/lib/firebase')
      const { onAuthStateChanged } = await import('firebase/auth')
      if (!auth) {
        setIsLoading(false)
        return
      }
      onAuthStateChanged(auth, async (user: any) => {
        setUserId(user?.uid || null)
        if (user?.uid) {
          try {
            const movRes = await fetch(`/api/profile/favorites?userId=${user.uid}&type=movies`)
            const movData = await movRes.json()
            setMovies(movData.items || [])
          } catch {}
          setIsLoading(false)
        } else {
          setIsLoading(false)
        }
      })
    }
    init()
  }, [])

  const removeMovie = async (movieId: string) => {
    if (!userId) return
    try {
      await fetch('/api/profile/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, movieId, type: 'movie'
        }),
      })
      setMovies(prev =>
        prev.filter((w: any) => w.id !== movieId))
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 sticky top-0 z-40 bg-[#0D0D0D] border-b border-[#1A1A2E]">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center text-white active:opacity-60 transition-opacity duration-150"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-lg font-bold text-white">Watchlist & Favorites</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3 px-4 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-32 h-20 bg-[#1A1A2E] rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-[#1A1A2E] rounded-full w-3/4" />
                <div className="h-3 bg-[#1A1A2E] rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Heart size={40} color="#4B5563" className="mb-3" />
          <p className="text-white font-semibold mb-1">No favorite movies</p>
          <p className="text-[#9CA3AF] text-sm text-center">
            Movies and drama you save to watchlist will appear here
          </p>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3" style={{ contentVisibility: 'auto' }}>
          {movies.map((item: any) => (
            <div key={item.id} className="flex gap-3 items-start">
              <button
                onClick={() => router.push(`/movies/${item.id}`)}
                className="flex-shrink-0 active:opacity-60 transition-opacity duration-150"
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  loading="lazy"
                  className="w-32 h-20 rounded-xl object-cover bg-[#1A1A2E]"
                />
              </button>
              <div className="flex-1 min-w-0 pt-0.5">
                <button
                  onClick={() => router.push(`/movies/${item.id}`)}
                  className="text-left w-full active:opacity-60 transition-opacity duration-150"
                >
                  <p className="text-white text-sm font-medium line-clamp-2 leading-tight mb-1">
                    {item.title}
                  </p>
                  <p className="text-[#9CA3AF] text-xs truncate">
                    {item.channel_name}
                  </p>
                </button>
              </div>
              <button
                onClick={() => removeMovie(item.id)}
                className="w-8 h-8 flex items-center justify-center active:opacity-60 transition-opacity duration-150 flex-shrink-0 mt-0.5"
              >
                <Trash2 size={15} color="#6B7280" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
