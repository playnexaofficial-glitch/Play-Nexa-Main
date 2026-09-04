'use client';
import { useState, useEffect, useCallback } from 'react'
import { Clapperboard, Search, Trash2, Eye, EyeOff, ExternalLink, RefreshCw } from 'lucide-react'

interface NatokItem {
  id: string
  youtube_id: string
  title: string
  thumbnail: string
  channel_name: string
  channel_id: string
  is_hidden: boolean
  created_at: string
  content_type?: string
}

export default function NatokPage() {
  const [items, setItems] = useState<NatokItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<NatokItem | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadNatok = useCallback(async () => {
    setLoading(true)
    try {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
      const res = await fetch(`/api/admin/natok${q}`)
      const json = await res.json()
      if (json.error) {
        showToast('Error: ' + json.error)
      } else {
        setItems(json.data || [])
      }
    } catch (err: any) {
      showToast('Error: ' + (err?.message || 'Failed to load Natok items'))
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadNatok()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadNatok])

  const toggleHide = async (item: NatokItem) => {
    try {
      const nextHidden = !item.is_hidden
      const res = await fetch('/api/admin/natok', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, is_hidden: nextHidden }),
      })
      const data = await res.json()
      if (data.success) {
        setItems((prev) =>
          prev.map((t) => (t.id === item.id ? { ...t, is_hidden: nextHidden } : t))
        )
        showToast(nextHidden ? 'Hidden from app' : 'Visible in app')
      } else {
        showToast('Error: ' + (data.error || 'Failed to update'))
      }
    } catch {
      showToast('Error: Network error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/natok?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      const data = await res.json()
      if (data.success) {
        setItems((prev) => prev.filter((t) => t.id !== deleteTarget.id))
        showToast('Natok item deleted')
      } else {
        showToast('Error: ' + (data.error || 'Delete failed'))
      }
    } catch {
      showToast('Error: Network error')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-900/20 flex items-center justify-center text-cyan-400">
            <Clapperboard size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Natok Hub</h1>
            <p className="text-xs text-[#9CA3AF]">
              {items.length} natok loaded • Real-time DB
            </p>
          </div>
        </div>

        <button
          onClick={loadNatok}
          className="px-3 py-2.5 bg-[#141420] border border-[#2D2D44] rounded-xl text-white text-xs font-semibold min-h-[44px] active:opacity-60 hover:bg-[#1A1A2E] flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search natok by title..."
          className="w-full h-12 bg-[#0F0F1A] border border-[#1A1A2E] rounded-xl pl-10 pr-4 text-white text-sm outline-none focus:border-cyan-500 placeholder-[#4B5563]"
        />
      </div>

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl">
          <p className="text-[#6B7280] text-sm">
            {search ? 'No natok match your search.' : 'No natok in database yet. Use Auto-Scan or Quick Add!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <div
              key={t.id}
              className={`bg-[#0F0F1A] border rounded-2xl overflow-hidden flex flex-col transition-all duration-150 ${
                t.is_hidden ? 'border-red-900/30 opacity-70' : 'border-[#1A1A2E] hover:border-[#2D2D44]'
              }`}
            >
              <div className="relative aspect-video bg-[#141420]">
                {t.thumbnail ? (
                  <img
                    src={t.thumbnail}
                    alt={t.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#4B5563]">
                    <Clapperboard size={32} />
                  </div>
                )}
                {t.is_hidden && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-red-900/80 text-red-200 text-xs font-semibold">
                    Hidden
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3
                    className="text-white text-sm font-semibold line-clamp-2 mb-1"
                    title={t.title}
                  >
                    {t.title}
                  </h3>
                  <p className="text-xs text-[#9CA3AF] mb-3">
                    {t.channel_name || 'YouTube Channel'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#1A1A2E] gap-2">
                  <a
                    href={`https://youtube.com/watch?v=${t.youtube_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 min-h-[36px]"
                  >
                    Watch <ExternalLink size={12} />
                  </a>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => toggleHide(t)}
                      className={`p-2 rounded-lg text-xs min-h-[36px] min-w-[36px] flex items-center justify-center transition-opacity ${
                        t.is_hidden
                          ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-800/40 hover:bg-yellow-900/40'
                          : 'bg-[#141420] text-[#9CA3AF] hover:text-white border border-[#2D2D44]'
                      }`}
                      title={t.is_hidden ? 'Make visible' : 'Hide from app'}
                    >
                      {t.is_hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="p-2 rounded-lg text-xs text-red-400 bg-red-900/20 border border-red-800/40 hover:bg-red-900/40 min-h-[36px] min-w-[36px] flex items-center justify-center transition-opacity"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/80"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] bg-[#0F0F1A] border border-[#2D2D44] rounded-2xl p-6 max-w-sm w-[90%] shadow-2xl">
            <h3 className="text-white font-bold text-base mb-2">Delete Natok?</h3>
            <p className="text-[#9CA3AF] text-xs mb-5 line-clamp-2">
              Are you sure you want to remove &quot;{deleteTarget.title}&quot; from Play Nexa?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 rounded-xl bg-[#141420] border border-[#2D2D44] text-[#9CA3AF] text-xs font-semibold hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-20 left-4 right-4 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-4 py-3 z-[70] max-w-sm mx-auto shadow-lg">
          <p className="text-white text-sm text-center">{toast}</p>
        </div>
      )}
    </div>
  )
}
