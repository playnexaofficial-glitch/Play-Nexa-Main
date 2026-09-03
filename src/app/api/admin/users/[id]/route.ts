import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Lookup user profile by id or auth_user_id
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .or(`id.eq.${id},auth_user_id.eq.${id}`)
      .maybeSingle()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userIds = Array.from(
      new Set([profile.id, profile.auth_user_id].filter(Boolean))
    ) as string[]

    // Execute independent queries in parallel using Promise.allSettled
    const [
      watchedRes,
      musicHistRes,
      gamesRes,
      watchlistRes,
      likesRes,
      musicLikesRes,
      musicSavedRes,
      recentWatchedRes,
      recentMusicRes,
    ] = await Promise.allSettled([
      supabaseAdmin
        .from('user_history')
        .select('*', { count: 'exact', head: true })
        .in('user_id', userIds),
      supabaseAdmin
        .from('music_history')
        .select('*', { count: 'exact', head: true })
        .in('user_id', userIds),
      supabaseAdmin
        .from('game_scores')
        .select('*', { count: 'exact', head: true })
        .in('user_id', userIds),
      supabaseAdmin
        .from('user_watchlist')
        .select('*', { count: 'exact', head: true })
        .in('user_id', userIds),
      supabaseAdmin
        .from('user_likes')
        .select('*', { count: 'exact', head: true })
        .in('user_id', userIds),
      supabaseAdmin
        .from('music_likes')
        .select('*', { count: 'exact', head: true })
        .in('user_id', userIds),
      supabaseAdmin
        .from('music_saved')
        .select('*', { count: 'exact', head: true })
        .in('user_id', userIds),
      supabaseAdmin
        .from('user_history')
        .select('movie_id, youtube_id, watched_at')
        .in('user_id', userIds)
        .order('watched_at', { ascending: false })
        .limit(40),
      supabaseAdmin
        .from('music_history')
        .select('track_id, youtube_id, played_at')
        .in('user_id', userIds)
        .order('played_at', { ascending: false })
        .limit(40),
    ])

    const moviesWatched =
      watchedRes.status === 'fulfilled' ? watchedRes.value.count || 0 : 0
    const tracksPlayed =
      musicHistRes.status === 'fulfilled' ? musicHistRes.value.count || 0 : 0
    const gamesPlayed =
      gamesRes.status === 'fulfilled' ? gamesRes.value.count || 0 : 0
    const watchlist =
      watchlistRes.status === 'fulfilled' ? watchlistRes.value.count || 0 : 0
    const movieLikes =
      likesRes.status === 'fulfilled' ? likesRes.value.count || 0 : 0
    const musicLikes =
      musicLikesRes.status === 'fulfilled' ? musicLikesRes.value.count || 0 : 0
    const musicSaved =
      musicSavedRes.status === 'fulfilled' ? musicSavedRes.value.count || 0 : 0

    const movieHist =
      recentWatchedRes.status === 'fulfilled'
        ? recentWatchedRes.value.data || []
        : []
    const musicHist =
      recentMusicRes.status === 'fulfilled'
        ? recentMusicRes.value.data || []
        : []

    // Fetch movie and music track details for taste breakdown and activity list
    const movieIds = Array.from(
      new Set(movieHist.map((h: any) => h.movie_id).filter(Boolean))
    )
    const trackIds = Array.from(
      new Set(musicHist.map((h: any) => h.track_id).filter(Boolean))
    )

    const [moviesDataRes, tracksDataRes] = await Promise.allSettled([
      movieIds.length > 0
        ? supabaseAdmin
            .from('movies')
            .select('id, title, genre, content_type')
            .in('id', movieIds)
        : Promise.resolve({ data: [] }),
      trackIds.length > 0
        ? supabaseAdmin
            .from('music_tracks')
            .select('id, title, mood, genre')
            .in('id', trackIds)
        : Promise.resolve({ data: [] }),
    ])

    const moviesList =
      moviesDataRes.status === 'fulfilled' ? moviesDataRes.value.data || [] : []
    const tracksList =
      tracksDataRes.status === 'fulfilled' ? tracksDataRes.value.data || [] : []

    const moviesMap = new Map(moviesList.map((m: any) => [m.id, m]))
    const tracksMap = new Map(tracksList.map((t: any) => [t.id, t]))

    // Aggregate Genre / Content Type breakdown for movies
    const genreCounts: Record<string, number> = {}
    movieHist.forEach((h: any) => {
      const m = moviesMap.get(h.movie_id)
      const genre =
        m?.genre?.trim() ||
        (m?.content_type === 'natok' ? 'Bangla Natok' : 'General')
      genreCounts[genre] = (genreCounts[genre] || 0) + 1
    })

    // Aggregate Mood breakdown for music
    const moodCounts: Record<string, number> = {}
    musicHist.forEach((h: any) => {
      const t = tracksMap.get(h.track_id)
      const mood = t?.mood?.trim() || t?.genre?.trim() || 'General'
      moodCounts[mood] = (moodCounts[mood] || 0) + 1
    })

    // Combine into 15 most recent entries
    const recentActivity = [
      ...movieHist.map((h: any) => {
        const m = moviesMap.get(h.movie_id)
        return {
          id: `movie_${h.movie_id}_${h.watched_at}`,
          title: m?.title || 'Video Content',
          type: m?.content_type === 'natok' ? 'Natok' : 'Movie',
          detail: m?.genre || null,
          timestamp: h.watched_at,
        }
      }),
      ...musicHist.map((h: any) => {
        const t = tracksMap.get(h.track_id)
        return {
          id: `track_${h.track_id}_${h.played_at}`,
          title: t?.title || 'Music Track',
          type: 'Music',
          detail: t?.mood || t?.genre || null,
          timestamp: h.played_at,
        }
      }),
    ]
      .filter((item) => item.timestamp)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 15)

    return NextResponse.json({
      profile: {
        id: profile.id,
        auth_user_id: profile.auth_user_id,
        email: profile.email,
        display_name: profile.display_name,
        auth_provider: profile.auth_provider,
        created_at: profile.created_at,
        is_banned: !!profile.is_banned,
        banned_at: profile.banned_at,
        ban_reason: profile.ban_reason,
        last_seen_at: profile.last_seen_at,
        approx_country: profile.approx_country,
        approx_city: profile.approx_city,
        avatar_url: profile.avatar_url,
        coins: profile.coins || 0,
      },
      stats: {
        moviesWatched,
        tracksPlayed,
        gamesPlayed,
        watchlist,
        movieLikes,
        musicLikes,
        musicSaved,
      },
      taste: {
        genres: genreCounts,
        moods: moodCounts,
      },
      recentActivity,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
