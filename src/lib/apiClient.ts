import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultSupabase, getSupabase } from './supabase'

function getClient(): SupabaseClient {
  if (defaultSupabase) return defaultSupabase
  const existing = getSupabase()
  if (existing) return existing
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  )
}

// Detect if running in Capacitor APK
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  const href = window.location.href
  return (
    href.startsWith('file://') ||
    href.startsWith('capacitor://') ||
    href.startsWith('ionic://') ||
    href.startsWith('https://localhost') ||
    href.includes('localhost')
  )
}

// Movie feed — works in both APK and Web
export async function getMoviesFeed(
  userId?: string | null,
  channelId?: string
) {
  if (isNativeApp()) {
    const supabase = getClient()
    // Direct Supabase query (APK mode)
    let query = supabase
      .from('movies')
      .select('id,youtube_id,title,thumbnail,' +
        'channel_name,channel_id,' +
        'view_count,watch_count,' +
        'created_at,genre,is_hidden')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (channelId && channelId !== 'all') {
      query = query.eq('channel_id', channelId)
    }

    const { data, error } = await query
    if (error) throw error

    return {
      featured: (data || []).slice(0, 5),
      trending: data || [],
      newReleases: data || [],
      channelSections: [],
      channels: [],
    }
  } else {
    // Vercel API route (Web mode)
    const params = new URLSearchParams()
    if (userId) params.set('userId', userId)
    if (channelId) params.set('channel', channelId)
    const res = await fetch(`/api/movies/feed?${params}`)
    return res.json()
  }
}

// Music feed — works in both APK and Web
export async function getMusicFeed(
  userId?: string | null,
  mood?: string
) {
  if (isNativeApp()) {
    const supabase = getClient()
    // Direct Supabase query
    const { data, error } = await supabase
      .from('music_tracks')
      .select('id,youtube_id,title,thumbnail,' +
        'channel_name,channel_id,created_at')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    const tracks = data || []

    return {
      quickPicks: tracks.slice(0, 20),
      topChannels: [],
      newReleases: tracks.slice(0, 10),
      recommended: tracks.slice(10, 30),
      recentlyPlayed: [],
    }
  } else {
    // Vercel API route
    const params = new URLSearchParams()
    if (userId) params.set('userId', userId)
    if (mood) params.set('mood', mood)
    const res = await fetch(`/api/ytmusic/feed?${params}`)
    return res.json()
  }
}

// Admin stats — works in both
export async function getAdminStats() {
  if (isNativeApp()) {
    const supabase = getClient()
    const [
      { count: movies },
      { count: music },
      { count: users },
      { count: channels },
      { count: games },
      { count: feedback },
    ] = await Promise.all([
      supabase.from('movies')
        .select('*', { count: 'exact', head: true }),
      supabase.from('music_tracks')
        .select('*', { count: 'exact', head: true }),
      supabase.from('user_profiles')
        .select('*', { count: 'exact', head: true }),
      supabase.from('yt_channels')
        .select('*', { count: 'exact', head: true }),
      supabase.from('games')
        .select('*', { count: 'exact', head: true }),
      supabase.from('user_feedback')
        .select('*', { count: 'exact', head: true }),
    ])
    return { movies, music, users,
      channels, games, feedback }
  } else {
    const res = await fetch('/api/admin/stats')
    return res.json()
  }
}
