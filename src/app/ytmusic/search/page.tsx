'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, X } from 'lucide-react'
import TrackRow from '@/components/ytmusic/TrackRow'

const RECENT_KEY = 'pn_ytmusic_searches'

const listContainerStyle: React.CSSProperties = {
  contentVisibility: 'auto',
}

export default function YTMusicSearchPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY)
      if (stored) {
        setRecent(JSON.parse(stored))
      }
    } catch {}
  }, [])

  useEffect(() => {
    setTimeout(() =>
      inputRef.current?.focus(), 100)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/ytmusic/search?q=` +
          encodeURIComponent(query.trim()))
        const data = await res.json()
        setResults(data.results || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const saveSearch = useCallback((q: string) => {
    if (!q.trim()) return
    const cleaned = q.trim()
    setRecent(prev => {
      const updated = [cleaned, ...prev.filter(s => s.toLowerCase() !== cleaned.toLowerCase())].slice(0, 10)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <div className="flex items-center gap-3 px-3 py-3 sticky top-0 z-40 bg-[#0D0D0D] border-b border-[#1A1A2E]">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center active:opacity-60"
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-3 h-11 focus-within:border-[#7C3AED]">
          <Search size={16} color="#6B7280" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 200)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && query.trim()) {
                saveSearch(query.trim())
              }
            }}
            placeholder="Search songs, artists, lyrics..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-[#6B7280]"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('')
                setResults([])
              }}
              className="active:opacity-60"
            >
              <X size={16} color="#6B7280" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-3">
        {/* Recent searches */}
        {!query.trim() && isFocused && recent.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold text-sm">Recent</p>
              <button
                onClick={() => {
                  setRecent([])
                  localStorage.removeItem(RECENT_KEY)
                }}
                className="text-[#7C3AED] text-xs active:opacity-60 transition-opacity duration-150"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1">
              {recent.map(s => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s)
                    saveSearch(s)
                  }}
                  className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl active:bg-[#1A1A2E] transition-colors duration-150 text-left"
                >
                  <Search size={14} color="#6B7280" />
                  <span className="text-[#9CA3AF] text-sm">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {results.length > 0 && !loading && (
          <div className="mt-2">
            <p className="text-[#9CA3AF] text-xs mb-3">
              {results.length} results
            </p>
            <div className="space-y-1" style={listContainerStyle}>
              {results.map(t => (
                <TrackRow
                  key={t.id}
                  track={t}
                  onPress={() => {
                    if (query.trim()) saveSearch(query.trim())
                    // Navigate to player
                    localStorage.setItem('pn_play_track', JSON.stringify(t))
                    router.push('/ytmusic')
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-white font-semibold mb-1">No results</p>
            <p className="text-[#9CA3AF] text-sm text-center">
              No tracks found for "{query}"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
