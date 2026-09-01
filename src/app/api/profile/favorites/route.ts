import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'


export async function GET(req: NextRequest) {
  try {
  const userId = req.nextUrl.searchParams.get('userId')
  const type = req.nextUrl.searchParams.get('type') || 'movies'

  if (!userId) {
    return NextResponse.json({ items: [] })
  }

  try {
    if (type === 'movies') {
      const { data: wl } = await supabaseAdmin
        .from('user_watchlist')
        .select('movie_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!wl || wl.length === 0) {
        return NextResponse.json({ items: [] })
      }

      const ids = wl
        .map((w: any) => w.movie_id)
        .filter(Boolean)

      const { data: movies } = await supabaseAdmin
        .from('movies')
        .select('id, youtube_id, title, thumbnail, channel_name, content_type')
        .in('id', ids)

      const items = wl
        .map((w: any) => {
          const m = (movies || []).find((mv: any) => mv.id === w.movie_id)
          return m ? { ...m, saved_at: w.created_at } : null
        })
        .filter(Boolean)

      return NextResponse.json({ items })
    } else {
      const { data: sl } = await supabaseAdmin
        .from('music_saved')
        .select('track_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!sl || sl.length === 0) {
        return NextResponse.json({ items: [] })
      }

      const ids = sl
        .map((s: any) => s.track_id)
        .filter(Boolean)

      const { data: tracks } = await supabaseAdmin
        .from('music_tracks')
        .select('id, youtube_id, title, thumbnail, channel_name')
        .in('id', ids)

      const items = sl
        .map((s: any) => {
          const t = (tracks || []).find((tr: any) => tr.id === s.track_id)
          return t ? { ...t, saved_at: s.created_at } : null
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
    const { userId, movieId, trackId, type } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    if (type === 'movie' && movieId) {
      await supabaseAdmin
        .from('user_watchlist')
        .delete()
        .eq('user_id', userId)
        .eq('movie_id', movieId)
      return NextResponse.json({ success: true })
    }

    if (type === 'music' && trackId) {
      await supabaseAdmin
        .from('music_saved')
        .delete()
        .eq('user_id', userId)
        .eq('track_id', trackId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
