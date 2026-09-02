import { NextRequest, NextResponse }
  from 'next/server'
import { supabaseAdmin }
  from '@/lib/supabaseAdmin'


const FIELDS =
  'id,youtube_id,title,thumbnail,' +
  'channel_name,channel_id,view_count,' +
  'watch_count,created_at,genre,content_type'

function applyType(q: any, type: string) {
  if (type !== 'all')
    return q.eq('content_type', type)
  return q
}

function addBadges(movies: any[]): any[] {
  if (!movies?.length) return []
  const maxW = Math.max(
    ...movies.map(m => m.watch_count || 0), 1)
  return movies.map(m => {
    const pct = Math.round(
      ((m.watch_count || 0) / maxW) * 100)
    const ageMs =
      Date.now() - new Date(m.created_at || 0)
        .getTime()
    return {
      ...m,
      watchPercent: pct,
      isNew: ageMs < 7 * 24 * 60 * 60 * 1000,
    }
  })
}

export async function GET(req: NextRequest) {
  try {
  const p = req.nextUrl.searchParams
  const userId = p.get('userId') || null
  const channel = p.get('channel') || 'all'
  const type = p.get('type') || 'all'

  try {
    // ── STEP E: Add user history signals ──
    let preferredChannels: string[] = []
    let continueWatching: any[] = []
    let becauseYouWatched: any = null
    let recommended: any[] = []

    if (userId) {
      // Get watch history
      const { data: hist } = await supabaseAdmin
        .from('user_history')
        .select('movie_id,watch_percent')
        .eq('user_id', userId)
        .order('watched_at', { ascending: false })
        .limit(50)

      const histIds = (hist || [])
        .map((h: any) => h.movie_id)
        .filter(Boolean)

      // Continue watching: 40-85% watched
      const partial = (hist || []).filter(
        (h: any) =>
          (h.watch_percent || 0) >= 40 &&
          (h.watch_percent || 0) < 90
      )
      if (partial.length > 0) {
        const partIds = partial.slice(0, 6)
          .map((h: any) => h.movie_id)
          .filter(Boolean)
        if (partIds.length > 0) {
          let cwQ = supabaseAdmin
            .from('movies')
            .select(
              'id,youtube_id,title,thumbnail,' +
              'channel_name,channel_id,created_at'
            )
            .in('id', partIds)
            .eq('is_hidden', false)
          if (type !== 'all')
            cwQ = cwQ.eq('content_type', type)
          const { data: cw } = (await cwQ) as any
          continueWatching = (cw || []).map(m => {
            const h = partial.find(
              (p: any) => p.movie_id === m.id)
            return {
              ...m,
              watchPercent: h?.watch_percent || 0
            }
          })
        }
      }

      // Channel affinity from history
      if (histIds.length > 0) {
        const { data: hMovies } =
          await supabaseAdmin
            .from('movies')
            .select('channel_id')
            .in('id', histIds)
            .eq('is_hidden', false)
        const chCount: Record<string,number> = {}
        for (const m of hMovies || []) {
          chCount[m.channel_id] =
            (chCount[m.channel_id] || 0) + 1
        }
        preferredChannels = Object.entries(chCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id]) => id)
      }

      // Recommended: unwatched from liked channels
      if (preferredChannels.length > 0) {
        let recQ = supabaseAdmin
          .from('movies')
          .select(
            'id,youtube_id,title,thumbnail,' +
            'channel_name,channel_id,' +
            'view_count,watch_count,created_at'
          )
          .eq('is_hidden', false)
          .in('channel_id', preferredChannels)
          .order('watch_count', { ascending: false })
          .limit(20)
        if (type !== 'all')
          recQ = recQ.eq('content_type', type)
        const { data: recData } = (await recQ) as any
        const exclude = new Set(histIds)
        const unwatched = (recData || [])
          .filter(m => !exclude.has(m.id))
        const watched = (recData || [])
          .filter(m => exclude.has(m.id))
        recommended = [
          ...unwatched.slice(0, 12),
          ...watched.slice(0, 4),
        ]
      }
      if (recommended.length < 4) {
        let fbQ = supabaseAdmin
          .from('movies')
          .select(
            'id,youtube_id,title,thumbnail,' +
            'channel_name,channel_id,' +
            'view_count,watch_count,created_at'
          )
          .eq('is_hidden', false)
          .order('watch_count', { ascending: false })
          .limit(16)
        if (type !== 'all')
          fbQ = fbQ.eq('content_type', type)
        const { data: fbData } = (await fbQ) as any
        recommended = fbData || []
      }

      // Because You Watched
      if (histIds.length > 0) {
        const { data: lastMovie } =
          await supabaseAdmin
            .from('movies')
            .select(
              'id,title,channel_id,channel_name'
            )
            .in('id', [histIds[0]])
            .maybeSingle()
        if (lastMovie) {
          let simQ = supabaseAdmin
            .from('movies')
            .select(
              'id,youtube_id,title,thumbnail,' +
              'channel_name,channel_id,created_at'
            )
            .eq('is_hidden', false)
            .eq('channel_id', lastMovie.channel_id)
            .neq('id', lastMovie.id)
            .order('watch_count', { ascending: false })
            .limit(10)
          if (type !== 'all')
            simQ = simQ.eq('content_type', type)
          const { data: sim } = (await simQ) as any
          if (sim && sim.length > 0) {
            becauseYouWatched = {
              basedOn: lastMovie.title,
              movies: sim,
            }
          }
        }
      }
    }

    // ── STEP D: Movie queries wrapped with applyType ──

    // 1. Featured Query
    let featuredQ = supabaseAdmin
      .from('movies')
      .select(FIELDS)
      .eq('is_hidden', false)
    if (channel !== 'all')
      featuredQ = featuredQ.eq('channel_id', channel)
    featuredQ = applyType(featuredQ, type)
    const { data: featured } = (await featuredQ
      .order('watch_count', { ascending: false })
      .limit(5)) as any

    // 2. Trending Query
    const week = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString()
    let trendingQ = supabaseAdmin
      .from('movies')
      .select(FIELDS)
      .eq('is_hidden', false)
    if (channel !== 'all')
      trendingQ = trendingQ.eq('channel_id', channel)
    trendingQ = applyType(trendingQ, type)
    const { data: trending } = (await trendingQ
      .gte('created_at', week)
      .order('watch_count', { ascending: false })
      .limit(20)) as any

    let finalTrending = trending || []
    if (finalTrending.length < 5) {
      let fallTrendQ = supabaseAdmin
        .from('movies')
        .select(FIELDS)
        .eq('is_hidden', false)
      if (channel !== 'all')
        fallTrendQ = fallTrendQ.eq('channel_id', channel)
      fallTrendQ = applyType(fallTrendQ, type)
      const { data: allTrend } = (await fallTrendQ
        .order('watch_count', { ascending: false })
        .limit(20)) as any
      finalTrending = allTrend || []
    }

    // 3. New Releases Query
    let newQ = supabaseAdmin
      .from('movies')
      .select(FIELDS)
      .eq('is_hidden', false)
    if (channel !== 'all')
      newQ = newQ.eq('channel_id', channel)
    newQ = applyType(newQ, type)
    const { data: newReleases } = (await newQ
      .order('created_at', { ascending: false })
      .limit(20)) as any

    // Load available channels
    const { data: allCh } = (await supabaseAdmin
      .from('movies')
      .select('channel_id,channel_name')
      .eq('is_hidden', false)) as any

    const chMap = new Map<string, string>()
    for (const m of allCh || []) {
      if (m.channel_id && !chMap.has(m.channel_id))
        chMap.set(m.channel_id, m.channel_name)
    }

    const sortedChannels = [
      ...[...chMap.entries()].filter(
        ([id]) => preferredChannels.includes(id)),
      ...[...chMap.entries()].filter(
        ([id]) => !preferredChannels.includes(id)),
    ]

    // 4. Channel Sections Query
    const channelSections: any[] = []
    for (const [chId, chName] of sortedChannels.slice(0, 5)) {
      let q = supabaseAdmin
        .from('movies')
        .select(FIELDS)
        .eq('is_hidden', false)
        .eq('channel_id', chId)
      q = applyType(q, type)
      const { data: chMovies } = (await q
        .order('watch_count', { ascending: false })
        .limit(10)) as any
      if (chMovies && chMovies.length > 0) {
        channelSections.push({
          channelId: chId,
          channelName: chName,
          movies: addBadges(chMovies),
        })
      }
    }

    const channels = [...chMap.entries()].map(
      ([id, name]) => ({ id, name }))

    // If recommended still empty, populate with fallback
    if (!recommended || recommended.length === 0) {
      let fbQ = supabaseAdmin
        .from('movies')
        .select(FIELDS)
        .eq('is_hidden', false)
        .order('watch_count', { ascending: false })
        .limit(16)
      fbQ = applyType(fbQ, type)
      const { data: fbData } = await fbQ
      recommended = fbData || []
    }

    return NextResponse.json({
      featured: addBadges(featured || []),
      trending: addBadges(finalTrending),
      newReleases: addBadges(newReleases || []),
      channelSections,
      channels,
      continueWatching,
      recommended: addBadges(recommended),
      becauseYouWatched,
    }, {
      headers: {
        'Cache-Control':
          's-maxage=60, stale-while-revalidate=300'
      }
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Feed failed' },
      { status: 500 }
    )
  }

  } catch (e) {
    return NextResponse.json({ ok: true });
  }}
