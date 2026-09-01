import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-static'

const REC_FIELDS =
  'id,youtube_id,title,thumbnail,' +
  'channel_name,channel_id,' +
  'watch_count,created_at,content_type'

export async function GET(req: NextRequest) {
  try {
  const id = req.nextUrl.searchParams.get('id')
  const userId = req.nextUrl.searchParams.get('userId') || null

  if (!id) {
    return NextResponse.json({ error: 'Movie ID required' }, { status: 400 })
  }

  try {
    // ── 1. Get movie ──────────────────────
    const { data: movie } = await supabaseAdmin
      .from('movies')
      .select('*')
      .eq('id', id)
      .single()

    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
    }

    // ── 2. Increment watch count ──────────
    await supabaseAdmin
      .from('movies')
      .update({
        watch_count: (movie.watch_count || 0) + 1,
      })
      .eq('id', id)

    // ── 3. User state ─────────────────────
    let userState = {
      liked: false,
      saved: false,
      reaction: null as string | null,
      subscribed: false,
    }

    if (userId) {
      const [
        { data: likeData },
        { data: saveData },
        { data: reactionData },
        { data: subscribedData },
        bookmarkRes,
      ] = await Promise.all([
        supabaseAdmin
          .from('user_likes')
          .select('id')
          .eq('user_id', userId)
          .eq('movie_id', id)
          .maybeSingle(),
        supabaseAdmin
          .from('user_watchlist')
          .select('id')
          .eq('user_id', userId)
          .eq('movie_id', id)
          .maybeSingle(),
        supabaseAdmin
          .from('movie_reactions')
          .select('reaction')
          .eq('user_id', userId)
          .eq('video_id', id)
          .maybeSingle(),
        supabaseAdmin
          .from('followed_channels')
          .select('id')
          .eq('user_id', userId)
          .eq('channel_id', movie.channel_id)
          .maybeSingle(),
        Promise.resolve(
          supabaseAdmin
            .from('watch_bookmarks')
            .select('seconds,watch_percent')
            .eq('user_id', userId)
            .eq('movie_id', id)
            .maybeSingle()
        ).catch(() => ({ data: null })) as any,
      ])

      const bookmarkData = bookmarkRes?.data || null

      userState = {
        liked: !!likeData,
        saved: !!saveData,
        reaction: reactionData?.reaction || null,
        subscribed: !!subscribedData,
        bookmark: bookmarkData,
      } as any

      // Record watch history
      await supabaseAdmin
        .from('user_history')
        .upsert(
          [
            {
              user_id: userId,
              movie_id: id,
              youtube_id: movie.youtube_id,
              watched_at: new Date().toISOString(),
              watch_percent: 0,
              content_type: movie.content_type || 'movie',
            },
          ],
          {
            onConflict: 'user_id,movie_id',
          }
        )
    }

    // ── 4. Smart recommendations ──────────
    const [
      { data: tier1 },
      { data: tier2 },
      { data: tier3 },
    ] = await Promise.all([
      supabaseAdmin
        .from('movies')
        .select(REC_FIELDS)
        .eq('is_hidden', false)
        .eq('channel_id', movie.channel_id)
        .eq('content_type', movie.content_type || 'movie')
        .neq('id', id)
        .order('watch_count', { ascending: false })
        .limit(8),

      supabaseAdmin
        .from('movies')
        .select(REC_FIELDS)
        .eq('is_hidden', false)
        .eq('content_type', movie.content_type || 'movie')
        .neq('channel_id', movie.channel_id)
        .neq('id', id)
        .order('watch_count', { ascending: false })
        .limit(6),

      supabaseAdmin
        .from('movies')
        .select(REC_FIELDS)
        .eq('is_hidden', false)
        .neq('id', id)
        .order('watch_count', { ascending: false })
        .limit(6),
    ])

    // Merge with deduplication
    const seen = new Set<string>()
    seen.add(id)
    const recommendations: any[] = []

    for (const m of [
      ...(tier1 || []),
      ...(tier2 || []),
      ...(tier3 || []),
    ] as any[]) {
      if (!seen.has(m.id) && recommendations.length < 20) {
        seen.add(m.id)
        recommendations.push(m)
      }
    }

    // ── 5. Channel info for sidebar ───────
    const { data: channelStats } = await supabaseAdmin
      .from('movies')
      .select('id')
      .eq('channel_id', movie.channel_id)
      .eq('is_hidden', false)

    return NextResponse.json({
      movie,
      userState,
      recommendations,
      channelVideoCount: channelStats?.length || 0,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed' },
      { status: 500 }
    )
  }

  } catch (e) {
    return NextResponse.json({ ok: true });
  }}
