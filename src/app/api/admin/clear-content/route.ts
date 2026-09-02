import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function DELETE() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin not configured' },
      { status: 500 }
    )
  }

  try {
    // Delete all movie-related data first (due to foreign key constraints)
    await Promise.allSettled([
      supabaseAdmin
        .from('movie_reactions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseAdmin
        .from('user_watchlist')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseAdmin
        .from('user_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseAdmin
        .from('user_likes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseAdmin
        .from('watch_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseAdmin
        .from('user_favorites')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'),
    ])

    // Delete music-related data
    await Promise.allSettled([
      supabaseAdmin
        .from('music_likes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseAdmin
        .from('music_saved')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseAdmin
        .from('playlist_tracks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseAdmin
        .from('music_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'),
    ])

    // Delete main content tables
    const { error: movErr } = await supabaseAdmin
      .from('movies')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    const { error: musErr } = await supabaseAdmin
      .from('music_tracks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    // Also clear channel_display (will be repopulated when new content added)
    await supabaseAdmin
      .from('channel_display')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    // Also clear yt_channels (full channel removal, not just display metadata)
    await supabaseAdmin
      .from('yt_channels')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    return NextResponse.json({
      success: true,
      message:
        'All movies, music, and channels cleared. Ready for fresh import.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
