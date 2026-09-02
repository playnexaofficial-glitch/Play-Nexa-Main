'use client';

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RefreshCw, Radio } from 'lucide-react'

interface DiscoveryState {
  id: number
  is_enabled: boolean
  current_phase: 'discovery' | 'import'
  daily_youtube_units_used: number
  daily_gemini_calls_used: number
  quota_reset_date: string
  last_run_at: string | null
  current_query_index: number
  channels_found_today: number
  videos_imported_today: number
  created_at?: string
  updated_at?: string
}

interface DiscoveryLog {
  id: string
  event_type: string
  message: string
  channel_id: string | null
  created_at: string
}

interface AiDiscoveryData {
  state: DiscoveryState | null
  logs: DiscoveryLog[]
  pendingImportCount: number
}

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return '—'
  const time = new Date(dateString).getTime()
  if (isNaN(time)) return '—'
  const diffSec = Math.floor((Date.now() - time) / 1000)

  if (diffSec < 30) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function formatLastRun(dateString?: string | null): string {
  if (!dateString) return 'never'
  const time = new Date(dateString).getTime()
  if (isNaN(time)) return 'never'
  const diffSec = Math.floor((Date.now() - time) / 1000)

  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function getLiveStatus(isEnabled: boolean, lastRunAt: string | null | undefined) {
  if (!isEnabled) {
    return {
      label: 'Disabled',
      dotClass: 'bg-[#6B7280]',
      badgeClass: 'bg-[#141420] text-[#9CA3AF] border-[#2D2D44]',
    }
  }

  if (!lastRunAt) {
    return {
      label: 'Waiting for first run',
      dotClass: 'bg-[#9CA3AF]',
      badgeClass: 'bg-[#141420] text-[#9CA3AF] border-[#2D2D44]',
    }
  }

  const lastRunTime = new Date(lastRunAt).getTime()
  if (isNaN(lastRunTime)) {
    return {
      label: 'Waiting for first run',
      dotClass: 'bg-[#9CA3AF]',
      badgeClass: 'bg-[#141420] text-[#9CA3AF] border-[#2D2D44]',
    }
  }

  const diffMinutes = (Date.now() - lastRunTime) / (1000 * 60)
  if (diffMinutes <= 30) {
    return {
      label: 'Active',
      dotClass: 'bg-[#10B981] animate-pulse',
      badgeClass: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30',
    }
  }

  return {
    label: 'Stale — check cron setup',
    dotClass: 'bg-[#F59E0B]',
    badgeClass: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  }
}

export default function AiDiscoveryCard() {
  const [data, setData] = useState<AiDiscoveryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    setError('')
    try {
      const res = await fetch('/api/admin/ai-discovery')
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setData(json)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch AI discovery status')
    } finally {
      setLoading(false)
      if (isManualRefresh) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchData()
      }
    }, 20000)

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchData()
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      clearInterval(intervalId)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [fetchData])

  const handleToggle = async () => {
    if (!data?.state || toggling) return
    const currentStatus = !!data.state.is_enabled
    const newStatus = !currentStatus

    setToggling(true)
    try {
      const res = await fetch('/api/admin/ai-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newStatus }),
      })
      const result = await res.json()
      if (result.success && result.state) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                state: {
                  ...prev.state!,
                  is_enabled: newStatus,
                },
              }
            : null
        )
      } else if (result.error) {
        setError(result.error)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle discovery engine')
    } finally {
      setToggling(false)
    }
  }

  const isEnabled = !!data?.state?.is_enabled
  const currentPhase = data?.state?.current_phase || 'discovery'
  const liveStatus = getLiveStatus(isEnabled, data?.state?.last_run_at)

  return (
    <div
      id="ai-discovery-engine-card"
      className="bg-[#1A1A2E] border border-[#2D2D44] rounded-2xl p-4 sm:p-5 mb-6 transition-all"
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#2D2D44]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#A78BFA] shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-white font-bold text-base tracking-wide">
                AI Auto-Discovery Engine
              </h2>
              {/* Live Status Indicator */}
              <span
                id="ai-discovery-live-status"
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1.5 ${liveStatus.badgeClass}`}
              >
                <span className={`w-2 h-2 rounded-full ${liveStatus.dotClass}`} />
                {liveStatus.label}
              </span>
              {/* Phase Badge */}
              <span
                id="ai-discovery-phase-badge"
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1.5 ${
                  currentPhase === 'import'
                    ? 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/30'
                    : 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/30'
                }`}
              >
                <Radio
                  size={10}
                  className={isEnabled ? 'animate-pulse' : 'opacity-40'}
                />
                {currentPhase === 'import' ? 'Import Phase' : 'Discovery Phase'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-[#9CA3AF] flex-wrap">
              <span>
                Autonomous channel exploration, Gemini video classification & RSS new upload scanner
              </span>
              <span className="text-[#6B7280] hidden sm:inline">•</span>
              <span className="text-[#D1D5DB]">
                Last run: {loading ? '—' : formatLastRun(data?.state?.last_run_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls: Refresh & Toggle */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            id="ai-discovery-refresh-button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-11 px-3 bg-[#141420] border border-[#2D2D44] rounded-xl text-[#9CA3AF] hover:text-white text-xs font-semibold min-h-[44px] flex items-center gap-1.5 active:opacity-60 transition-opacity"
            title="Refresh status"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#7C3AED]' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* ON / OFF Toggle Switch */}
          <button
            id="ai-discovery-toggle-button"
            onClick={handleToggle}
            disabled={loading || toggling}
            className="min-h-[44px] px-2 py-1 flex items-center gap-2.5 cursor-pointer active:opacity-60 transition-opacity disabled:opacity-50"
            aria-label={`Toggle AI Auto-Discovery Engine ${isEnabled ? 'OFF' : 'ON'}`}
          >
            <span
              className={`text-xs font-bold tracking-wider ${
                isEnabled ? 'text-[#A78BFA]' : 'text-[#6B7280]'
              }`}
            >
              {isEnabled ? 'ON' : 'OFF'}
            </span>
            <div
              className={`w-12 h-6 rounded-full relative transition-colors ${
                isEnabled ? 'bg-[#7C3AED]' : 'bg-[#2D2D44]'
              }`}
            >
              <span
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                  isEnabled ? 'left-[26px]' : 'left-0.5'
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-700/40 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Stats Grid - 5 stat numbers, plain static placeholders when loading */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 my-4">
        {/* Channels Found Today */}
        <div className="bg-[#141420] border border-[#232338] rounded-xl p-3 text-center">
          <p className="text-white font-bold text-lg leading-tight">
            {loading ? '—' : (data?.state?.channels_found_today ?? 0)}
          </p>
          <p className="text-[#9CA3AF] text-xs mt-1">Channels Today</p>
        </div>

        {/* Videos Imported Today */}
        <div className="bg-[#141420] border border-[#232338] rounded-xl p-3 text-center">
          <p className="text-white font-bold text-lg leading-tight">
            {loading ? '—' : (data?.state?.videos_imported_today ?? 0)}
          </p>
          <p className="text-[#9CA3AF] text-xs mt-1">Videos Today</p>
        </div>

        {/* YouTube Quota Used */}
        <div className="bg-[#141420] border border-[#232338] rounded-xl p-3 text-center">
          <p className="text-white font-bold text-lg leading-tight truncate">
            {loading
              ? '—'
              : `${(data?.state?.daily_youtube_units_used ?? 0).toLocaleString()}`}
            <span className="text-xs text-[#6B7280] font-normal ml-1">/ 10k</span>
          </p>
          <p className="text-[#9CA3AF] text-xs mt-1">YouTube Quota</p>
        </div>

        {/* Gemini Calls Used */}
        <div className="bg-[#141420] border border-[#232338] rounded-xl p-3 text-center">
          <p className="text-white font-bold text-lg leading-tight">
            {loading ? '—' : (data?.state?.daily_gemini_calls_used ?? 0)}
          </p>
          <p className="text-[#9CA3AF] text-xs mt-1">Gemini Calls</p>
        </div>

        {/* Channels Pending Import */}
        <div className="bg-[#141420] border border-[#232338] rounded-xl p-3 text-center col-span-2 sm:col-span-1">
          <p
            className={`font-bold text-lg leading-tight ${
              (data?.pendingImportCount || 0) > 0 ? 'text-[#06B6D4]' : 'text-white'
            }`}
          >
            {loading ? '—' : (data?.pendingImportCount ?? 0)}
          </p>
          <p className="text-[#9CA3AF] text-xs mt-1">Pending Import</p>
        </div>
      </div>

      {/* Activity Log Section */}
      <div className="mt-4 pt-3 border-t border-[#2D2D44]">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-white text-xs font-semibold tracking-wider uppercase">
            Recent Activity Log
          </h3>
          <span className="text-[11px] text-[#6B7280]">
            Last run: {loading ? '—' : formatRelativeTime(data?.state?.last_run_at)}
          </span>
        </div>

        <div className="bg-[#141420] border border-[#232338] rounded-xl divide-y divide-[#232338] max-h-56 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-xs text-[#6B7280]">—</div>
          ) : !data?.logs || data.logs.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#6B7280]">
              No activity recorded yet. Engine will log events when running.
            </div>
          ) : (
            data.logs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="px-3 py-2 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      log.event_type === 'videos_imported' ||
                      log.event_type === 'rss_new_upload_found'
                        ? 'bg-[#10B981]'
                        : log.event_type === 'channel_discovered' ||
                          log.event_type === 'channel_completed'
                        ? 'bg-[#7C3AED]'
                        : log.event_type === 'error' || log.event_type === 'quota_warning'
                        ? 'bg-[#EF4444]'
                        : 'bg-[#06B6D4]'
                    }`}
                  />
                  <span className="text-[#D1D5DB] leading-relaxed break-words">
                    {log.message}
                  </span>
                </div>
                <span className="text-[#6B7280] text-[11px] shrink-0 whitespace-nowrap mt-0.5">
                  {formatRelativeTime(log.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
