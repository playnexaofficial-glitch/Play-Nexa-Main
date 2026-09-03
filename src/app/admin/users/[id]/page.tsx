'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Film,
  Music,
  Gamepad2,
  Bookmark,
  Heart,
  Send,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Calendar,
  Clock,
  User,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react'
import { useToast } from '@/components/admin/Toast'

interface UserProfile {
  id: string
  auth_user_id?: string
  email: string
  display_name?: string
  auth_provider?: string
  created_at: string
  is_banned: boolean
  banned_at?: string | null
  ban_reason?: string | null
  last_seen_at?: string | null
  approx_country?: string | null
  approx_city?: string | null
  avatar_url?: string | null
  coins?: number
}

interface UserStats {
  moviesWatched: number
  tracksPlayed: number
  gamesPlayed: number
  watchlist: number
  movieLikes: number
  musicLikes: number
  musicSaved: number
}

interface RecentActivityItem {
  id: string
  title: string
  type: string
  detail?: string | null
  timestamp: string
}

interface UserAnalyticsData {
  profile: UserProfile
  stats: UserStats
  taste: {
    genres: Record<string, number>
    moods: Record<string, number>
  }
  recentActivity: RecentActivityItem[]
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Never'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  if (isNaN(then)) return '—'
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function formatLocation(city?: string | null, country?: string | null): string {
  if (!city && !country) return 'Unknown'
  if (city && country) return `${city}, ${country}`
  return city || country || 'Unknown'
}

export default function UserAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params?.id as string

  const { showToast } = useToast()

  const [data, setData] = useState<UserAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  // Notification form state
  const [showNotifyForm, setShowNotifyForm] = useState(false)
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMessage, setNotifyMessage] = useState('')
  const [isSendingNotify, setIsSendingNotify] = useState(false)

  // Ban management state
  const [banReasonInput, setBanReasonInput] = useState('')
  const [isUpdatingBan, setIsUpdatingBan] = useState(false)
  const [showBanConfirm, setShowBanConfirm] = useState(false)

  const fetchUserData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to load user analytics')
      }
      setData(json)
      if (json.profile?.ban_reason) {
        setBanReasonInput(json.profile.ban_reason)
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading user data')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  const copyId = () => {
    if (!userId) return
    navigator.clipboard.writeText(userId)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
    showToast('User ID copied to clipboard', 'info')
  }

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notifyTitle.trim() || !notifyMessage.trim()) {
      showToast('Please enter both title and message', 'error')
      return
    }

    setIsSendingNotify(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notifyTitle.trim(),
          message: notifyMessage.trim(),
        }),
      })
      const resData = await res.json()
      if (!res.ok || resData.error) {
        throw new Error(resData.error || 'Failed to send notification')
      }
      showToast('Notification sent successfully to this user', 'success')
      setNotifyTitle('')
      setNotifyMessage('')
      setShowNotifyForm(false)
    } catch (err: any) {
      showToast(err.message || 'Failed to send notification', 'error')
    } finally {
      setIsSendingNotify(false)
    }
  }

  const handleToggleBan = async (shouldBan: boolean) => {
    setIsUpdatingBan(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banned: shouldBan,
          reason: shouldBan ? (banReasonInput.trim() || 'Violating platform guidelines') : null,
        }),
      })
      const resData = await res.json()
      if (!res.ok || resData.error) {
        throw new Error(resData.error || 'Failed to update ban status')
      }

      showToast(
        shouldBan ? 'User account has been banned' : 'User account has been restored',
        shouldBan ? 'error' : 'success'
      )
      setShowBanConfirm(false)
      fetchUserData()
    } catch (err: any) {
      showToast(err.message || 'Error updating ban status', 'error')
    } finally {
      setIsUpdatingBan(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#9CA3AF] text-sm">Loading user analytics deep-dive...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 max-w-2xl mx-auto mt-8">
        <div className="bg-red-900/20 border border-red-700/40 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-white font-bold text-lg mb-1">User Not Found</h2>
          <p className="text-red-300 text-sm mb-5">{error || 'Could not locate analytics for this user'}</p>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#141420] border border-[#2D2D44] hover:bg-[#1A1A2E] text-white text-xs font-semibold rounded-xl min-h-[44px]"
          >
            <ArrowLeft size={16} /> Return to User List
          </Link>
        </div>
      </div>
    )
  }

  const { profile, stats, taste, recentActivity } = data
  const isBanned = profile.is_banned
  const initial = (profile.display_name || profile.email || '?')[0].toUpperCase()

  const genresList = Object.entries(taste?.genres || {}).sort((a, b) => b[1] - a[1])
  const moodsList = Object.entries(taste?.moods || {}).sort((a, b) => b[1] - a[1])
  const maxGenreCount = genresList.length > 0 ? Math.max(...genresList.map(([, c]) => c)) : 1
  const maxMoodCount = moodsList.length > 0 ? Math.max(...moodsList.map(([, c]) => c)) : 1

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#141420] border border-[#2D2D44] hover:bg-[#1A1A2E] text-white text-xs font-semibold rounded-xl min-h-[44px] transition-colors"
        >
          <ArrowLeft size={16} /> Back to Users
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotifyForm(!showNotifyForm)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-xl min-h-[44px] transition-colors"
          >
            <Send size={15} />
            {showNotifyForm ? 'Close Notification Form' : 'Send User Notification'}
          </button>

          <button
            onClick={fetchUserData}
            className="p-2.5 bg-[#141420] border border-[#2D2D44] hover:bg-[#1A1A2E] text-white rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Inline Direct Notification Form */}
      {showNotifyForm && (
        <div className="bg-[#0F0F1A] border border-[#7C3AED]/40 rounded-2xl p-5 transition-all">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Send size={16} className="text-[#7C3AED]" /> Send Direct In-App Notification
            </h2>
            <span className="text-xs text-[#9CA3AF]">
              Target: <code className="text-[#A78BFA]">{profile.email}</code>
            </span>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-3 max-w-2xl">
            <div>
              <label className="text-[#9CA3AF] text-xs mb-1 block">Title *</label>
              <input
                type="text"
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                placeholder="e.g. Account update or special recommendation"
                className="w-full h-11 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div>
              <label className="text-[#9CA3AF] text-xs mb-1 block">Message *</label>
              <textarea
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                placeholder="Type your message content here..."
                rows={3}
                className="w-full bg-[#141420] border border-[#2D2D44] rounded-xl p-3 text-white text-sm outline-none focus:border-[#7C3AED] resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowNotifyForm(false)}
                className="px-4 py-2 bg-[#141420] border border-[#2D2D44] hover:bg-[#1A1A2E] text-white text-xs font-semibold rounded-xl min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSendingNotify}
                className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-xs font-semibold rounded-xl min-h-[44px] flex items-center gap-1.5"
              >
                <Send size={14} />
                {isSendingNotify ? 'Sending...' : 'Send to User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Profile Header Card */}
      <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white truncate">
                  {profile.display_name || profile.email}
                </h1>
                {isBanned ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                    <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                    Banned
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    Active Account
                  </span>
                )}
              </div>
              <p className="text-[#9CA3AF] text-sm mt-0.5 truncate">{profile.email}</p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-[#6B7280]">
                <span>ID:</span>
                <code className="text-[#A78BFA] bg-[#141420] px-1.5 py-0.5 rounded border border-[#2D2D44]">
                  {userId}
                </code>
                <button
                  onClick={copyId}
                  className="hover:text-white p-1 rounded"
                  title="Copy User ID"
                >
                  {copiedId ? <Check size={14} className="text-[#10B981]" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Details Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-[#141420] border border-[#2D2D44] rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[#9CA3AF] mb-1">
                <MapPin size={14} className="text-[#06B6D4]" /> Location
              </div>
              <p className="text-white font-medium truncate">
                {formatLocation(profile.approx_city, profile.approx_country)}
              </p>
            </div>

            <div className="bg-[#141420] border border-[#2D2D44] rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[#9CA3AF] mb-1">
                <Clock size={14} className="text-[#10B981]" /> Last Active
              </div>
              <p className="text-white font-medium truncate">
                {formatRelativeTime(profile.last_seen_at || profile.created_at)}
              </p>
            </div>

            <div className="bg-[#141420] border border-[#2D2D44] rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[#9CA3AF] mb-1">
                <Calendar size={14} className="text-[#F59E0B]" /> Joined
              </div>
              <p className="text-white font-medium truncate">
                {formatDate(profile.created_at)}
              </p>
            </div>

            <div className="bg-[#141420] border border-[#2D2D44] rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[#9CA3AF] mb-1">
                <User size={14} className="text-[#A78BFA]" /> Provider
              </div>
              <p className="text-white font-medium capitalize truncate">
                {profile.auth_provider || 'Email'}
              </p>
            </div>
          </div>
        </div>

        {isBanned && profile.ban_reason && (
          <div className="mt-4 pt-4 border-t border-[#1A1A2E] text-xs flex items-center gap-2 text-red-400 bg-red-950/20 p-3 rounded-xl border border-red-900/30">
            <ShieldAlert size={16} className="flex-shrink-0" />
            <span>
              <strong>Ban Reason:</strong> {profile.ban_reason}
              {profile.banned_at && ` (Banned on ${formatDate(profile.banned_at)})`}
            </span>
          </div>
        )}
      </div>

      {/* Feature Usage Stat Cards (Matching Dashboard Pattern) */}
      <div>
        <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
          Feature Usage & Engagement
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-4 transition-all duration-150 hover:border-[#2D2D44]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-[#7C3AED]/20">
              <Film size={20} className="text-[#7C3AED]" strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold text-white">{stats.moviesWatched}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Movies Watched</p>
          </div>

          <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-4 transition-all duration-150 hover:border-[#2D2D44]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-[#06B6D4]/20">
              <Music size={20} className="text-[#06B6D4]" strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold text-white">{stats.tracksPlayed}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Tracks Played</p>
          </div>

          <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-4 transition-all duration-150 hover:border-[#2D2D44]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-[#10B981]/20">
              <Gamepad2 size={20} className="text-[#10B981]" strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold text-white">{stats.gamesPlayed}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Games Played</p>
          </div>

          <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-4 transition-all duration-150 hover:border-[#2D2D44]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-[#F59E0B]/20">
              <Bookmark size={20} className="text-[#F59E0B]" strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold text-white">{stats.watchlist}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">In Watchlist</p>
          </div>

          <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-4 transition-all duration-150 hover:border-[#2D2D44]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-[#EC4899]/20">
              <Heart size={20} className="text-[#EC4899]" strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold text-white">{stats.movieLikes}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Movie Likes</p>
          </div>

          <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-4 transition-all duration-150 hover:border-[#2D2D44]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-[#8B5CF6]/20">
              <Heart size={20} className="text-[#8B5CF6]" strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold text-white">{stats.musicLikes + stats.musicSaved}</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Music Fav/Saved</p>
          </div>
        </div>
      </div>

      {/* Taste Breakdown (Clean proportional bar rows, no heavy charting library) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Movie/Natok Taste */}
        <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Film size={18} className="text-[#7C3AED]" />
            <h3 className="text-white font-semibold text-sm">Video Genre Taste Breakdown</h3>
          </div>

          {genresList.length === 0 ? (
            <p className="text-[#6B7280] text-xs py-8 text-center">
              No movie or drama watch activity recorded for this user yet.
            </p>
          ) : (
            <div className="space-y-3">
              {genresList.map(([genre, count]) => {
                const pct = Math.round((count / maxGenreCount) * 100)
                return (
                  <div key={genre} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-medium truncate max-w-[200px]">{genre}</span>
                      <span className="text-[#9CA3AF]">{count} watched</span>
                    </div>
                    <div className="w-full h-2 bg-[#141420] rounded-full overflow-hidden border border-[#2D2D44]">
                      <div
                        className="h-full bg-[#7C3AED] rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(8, pct)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Music Mood Taste */}
        <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Music size={18} className="text-[#06B6D4]" />
            <h3 className="text-white font-semibold text-sm">Music Mood Taste Breakdown</h3>
          </div>

          {moodsList.length === 0 ? (
            <p className="text-[#6B7280] text-xs py-8 text-center">
              No music listen activity recorded for this user yet.
            </p>
          ) : (
            <div className="space-y-3">
              {moodsList.map(([mood, count]) => {
                const pct = Math.round((count / maxMoodCount) * 100)
                return (
                  <div key={mood} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-medium truncate max-w-[200px]">{mood}</span>
                      <span className="text-[#9CA3AF]">{count} played</span>
                    </div>
                    <div className="w-full h-2 bg-[#141420] rounded-full overflow-hidden border border-[#2D2D44]">
                      <div
                        className="h-full bg-[#06B6D4] rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(8, pct)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">
          Recent Activity Timeline (Last 15 items)
        </h3>

        {recentActivity.length === 0 ? (
          <p className="text-[#6B7280] text-xs py-8 text-center">
            No recent watch or listen history available.
          </p>
        ) : (
          <div className="divide-y divide-[#1A1A2E]">
            {recentActivity.map((item) => {
              const isMusic = item.type === 'Music'
              const isNatok = item.type === 'Natok'

              return (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isMusic
                          ? 'bg-[#06B6D4]/15 text-[#06B6D4]'
                          : isNatok
                          ? 'bg-[#EC4899]/15 text-[#EC4899]'
                          : 'bg-[#7C3AED]/15 text-[#7C3AED]'
                      }`}
                    >
                      {isMusic ? <Music size={16} /> : <Film size={16} />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{item.title}</p>
                      {item.detail && (
                        <p className="text-[#6B7280] text-[11px] truncate">{item.detail}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium text-[11px] ${
                        isMusic
                          ? 'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/30'
                          : isNatok
                          ? 'bg-[#EC4899]/10 text-[#EC4899] border border-[#EC4899]/30'
                          : 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/30'
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="text-[#9CA3AF] whitespace-nowrap">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Danger Zone Section (Matching src/app/admin/dashboard/page.tsx) */}
      <div className="bg-red-900/10 border border-red-800/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert size={18} className="text-red-400" />
          <p className="text-red-400 font-semibold text-sm">Danger Zone: Account Moderation</p>
        </div>
        <p className="text-[#9CA3AF] text-xs mb-4">
          Suspended users are logged out immediately and prevented from signing into Play Nexa.
        </p>

        {isBanned ? (
          <div className="space-y-3">
            <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 text-xs text-red-300">
              This account is currently <strong>BANNED</strong>.
              {profile.ban_reason && ` Reason: "${profile.ban_reason}"`}
            </div>

            <button
              onClick={() => handleToggleBan(false)}
              disabled={isUpdatingBan}
              className="w-full h-11 rounded-xl text-sm font-semibold bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981]/30 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {isUpdatingBan ? 'Restoring Access...' : 'Unban User Account & Restore Access'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[#9CA3AF] text-xs mb-1 block">
                Suspension / Ban Reason (shown to user upon login)
              </label>
              <input
                type="text"
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                placeholder="e.g. Terms violation, abusive behavior, or suspicious activity"
                className="w-full h-11 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-red-500"
              />
            </div>

            <button
              onClick={() => {
                if (!showBanConfirm) {
                  setShowBanConfirm(true)
                } else {
                  handleToggleBan(true)
                }
              }}
              disabled={isUpdatingBan}
              className={`w-full h-11 rounded-xl text-sm font-semibold disabled:opacity-50 active:opacity-60 transition-colors min-h-[44px] ${
                showBanConfirm
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-900/30 border border-red-700/40 text-red-400 hover:bg-red-900/50'
              }`}
            >
              {isUpdatingBan
                ? 'Applying Suspension...'
                : showBanConfirm
                ? 'Confirm Ban — Immediately Suspend Account'
                : 'Ban User Account'}
            </button>

            {showBanConfirm && (
              <button
                type="button"
                onClick={() => setShowBanConfirm(false)}
                className="w-full text-center text-xs text-[#9CA3AF] hover:text-white py-1"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
