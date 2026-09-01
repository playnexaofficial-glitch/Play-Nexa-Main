import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-static'

export async function GET(req: NextRequest) {
  try {
  const userId = req.nextUrl.searchParams.get('userId')
  const type = req.nextUrl.searchParams.get('type') || 'movies'

  if (!userId) {
    return NextResponse.json({ items: [] })
  }

  try {
    if (type === 'movies') {
      // Step 1: Get history records
      const { data: hist } = await supabaseAdmin
        .from('user_history')
        .select('movie_id, youtube_id, watched_at')
        .eq('user_id', userId)
        .order('watched_at', { ascending: false })
        .limit(40)

      if (!hist || hist.length === 0) {
        return NextResponse.json({ items: [] })
      }

      // Step 2: Get movie details
      const movieIds = hist
        .map((h: any) => h.movie_id)
        .filter(Boolean)

      let movies: any[] = []
      if (movieIds.length > 0) {
        const { data } = await supabaseAdmin
          .from('movies')
          .select('id, youtube_id, title, thumbnail, channel_name')
          .in('id', movieIds)
        movies = data || []
      }

      // Merge
      const items = hist
        .map((h: any) => {
          const movie = movies.find((m: any) => m.id === h.movie_id)
          if (!movie) return null
          return {
            ...movie,
            watched_at: h.watched_at,
          }
        })
        .filter(Boolean)

      return NextResponse.json({ items })
    } else {
      // Music history
      const { data: hist } = await supabaseAdmin
        .from('music_history')
        .select('track_id, youtube_id, played_at')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(40)

      if (!hist || hist.length === 0) {
        return NextResponse.json({ items: [] })
      }

      const trackIds = hist
        .map((h: any) => h.track_id)
        .filter(Boolean)

      let tracks: any[] = []
      if (trackIds.length > 0) {
        const { data } = await supabaseAdmin
          .from('music_tracks')
          .select('id, youtube_id, title, thumbnail, channel_name')
          .in('id', trackIds)
        tracks = data || []
      }

      const items = hist
        .map((h: any) => {
          const track = tracks.find((t: any) => t.id === h.track_id)
          if (!track) return null
          return {
            ...track,
            played_at: h.played_at,
          }
        })
        .filter(Boolean)

      return NextResponse.json({ items })
    }
  } catch (err: any) {
    return NextResponse.json({ items: [], error: err.message })
  }

  } catch (e) {
    return NextResponse.json({ ok: true });
  }}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, itemId, type, clearAll } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    if (clearAll) {
      await Promise.all([
        supabaseAdmin.from('user_history').delete().eq('user_id', userId),
        supabaseAdmin.from('music_history').delete().eq('user_id', userId),
      ])
      return NextResponse.json({ success: true })
    }

    if (type === 'movie' && itemId) {
      await supabaseAdmin
        .from('user_history')
        .delete()
        .eq('user_id', userId)
        .eq('movie_id', itemId)
      return NextResponse.json({ success: true })
    }

    if (type === 'music' && itemId) {
      await supabaseAdmin
        .from('music_history')
        .delete()
        .eq('user_id', userId)
        .eq('track_id', itemId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
