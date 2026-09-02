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
      // ── Build top-level independent queries ──

      // 1. Featured Query
      let featuredQ = supabaseAdmin
        .from('movies')
        .select(FIELDS)
        .eq('is_hidden', false)
      if (channel !== 'all')
        featuredQ = featuredQ.eq('channel_id', channel)
      featuredQ = applyType(featuredQ, type)
        .order('watch_count', { ascending: false })
        .limit(5)

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
        .gte('created_at', week)
        .order('watch_count', { ascending: false })
        .limit(20)

      // 3. New Releases Query
      let newQ = supabaseAdmin
        .from('movies')
        .select(FIELDS)
        .eq('is_hidden', false)
      if (channel !== 'all')
        newQ = newQ.eq('channel_id', channel)
      newQ = applyType(newQ, type)
        .order('created_at', { ascending: false })
        .limit(20)

      // 4. Available channels Query
      const allChQ = supabaseAdmin
        .from('movies')
        .select('channel_id,channel_name')
        .eq('is_hidden', false)

      // 5. User watch history Query (if userId provided)
      const histQ = userId
        ? supabaseAdmin
            .from('user_history')
            .select('movie_id,watch_percent')
            .eq('user_id', userId)
            .order('watched_at', { ascending: false })
            .limit(50)
        : Promise.resolve({ data: null })

      // Execute all 5 top-level queries concurrently
      const [
        { data: featured },
        { data: trending },
        { data: newReleases },
        { data: allCh },
        { data: hist },
      ] = (await Promise.all([
        featuredQ,
        trendingQ,
        newQ,
        allChQ,
        histQ,
      ])) as any[]

      // Handle trending fallback if needed
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

      // ── Process User signals & history-derived queries ──
      let preferredChannels: string[] = []
      let continueWatching: any[] = []
      let becauseYouWatched: any = null
      let recommended: any[] = []

      if (userId && hist && hist.length > 0) {
        const histIds = hist
          .map((h: any) => h.movie_id)
          .filter(Boolean)

        const partial = hist.filter(
          (h: any) =>
            (h.watch_percent || 0) >= 40 &&
            (h.watch_percent || 0) < 90
        )
        const partIds = partial.slice(0, 6)
          .map((h: any) => h.movie_id)
          .filter(Boolean)

        // Run secondary user queries in parallel: Continue Watching, Channel Affinity, and Last Watched Movie
        const cwPromise = (async () => {
          if (partIds.length === 0) return []
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
          return (cw || []).map((m: any) => {
            const h = partial.find((p: any) => p.movie_id === m.id)
            return {
              ...m,
              watchPercent: h?.watch_percent || 0,
            }
          })
        })()

        const hMoviesPromise = (async () => {
          if (histIds.length === 0) return []
          const { data: hMovies } = await supabaseAdmin
            .from('movies')
            .select('channel_id')
            .in('id', histIds)
            .eq('is_hidden', false)
          const chCount: Record<string, number> = {}
          for (const m of hMovies || []) {
            chCount[m.channel_id] = (chCount[m.channel_id] || 0) + 1
          }
          return Object.entries(chCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id]) => id)
        })()

        const lastMoviePromise = (async () => {
          if (histIds.length === 0) return null
          const { data: lastMovie } = await supabaseAdmin
            .from('movies')
            .select('id,title,channel_id,channel_name')
            .in('id', [histIds[0]])
            .maybeSingle()
          return lastMovie
        })()

        const [cwResult, prefChannelsResult, lastMovieResult] = await Promise.all([
          cwPromise,
          hMoviesPromise,
          lastMoviePromise,
        ])

        continueWatching = cwResult
        preferredChannels = prefChannelsResult

        // Run Tertiary queries in parallel: Recommended + Because You Watched
        const recPromise = (async () => {
          let recList: any[] = []
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
            const unwatched = (recData || []).filter((m: any) => !exclude.has(m.id))
            const watched = (recData || []).filter((m: any) => exclude.has(m.id))
            recList = [
              ...unwatched.slice(0, 12),
              ...watched.slice(0, 4),
            ]
          }
          if (recList.length < 4) {
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
            recList = fbData || []
          }
          return recList
        })()

        const simPromise = (async () => {
          if (!lastMovieResult) return null
          let simQ = supabaseAdmin
            .from('movies')
            .select(
              'id,youtube_id,title,thumbnail,' +
              'channel_name,channel_id,created_at'
            )
            .eq('is_hidden', false)
            .eq('channel_id', lastMovieResult.channel_id)
            .neq('id', lastMovieResult.id)
            .order('watch_count', { ascending: false })
            .limit(10)
          if (type !== 'all')
            simQ = simQ.eq('content_type', type)
          const { data: sim } = (await simQ) as any
          if (sim && sim.length > 0) {
            return {
              basedOn: lastMovieResult.title,
              movies: sim,
            }
          }
          return null
        })()

        const [recResult, simResult] = await Promise.all([
          recPromise,
          simPromise,
        ])
        recommended = recResult
        becauseYouWatched = simResult
      }

      // ── Process channel mappings & channel sections ──
      const chMap = new Map<string, string>()
      for (const m of allCh || []) {
        if (m.channel_id && !chMap.has(m.channel_id))
          chMap.set(m.channel_id, m.channel_name)
      }

      const sortedChannels = [
        ...[...chMap.entries()].filter(([id]) => preferredChannels.includes(id)),
        ...[...chMap.entries()].filter(([id]) => !preferredChannels.includes(id)),
      ]

      // Fetch up to 5 channel sections concurrently in parallel
      const top5Channels = sortedChannels.slice(0, 5)
      const channelSectionPromises = top5Channels.map(async ([chId, chName]) => {
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
          return {
            channelId: chId,
            channelName: chName,
            movies: addBadges(chMovies),
          }
        }
        return null
      })

      const channelSectionsResults = await Promise.all(channelSectionPromises)
      const channelSections = channelSectionsResults.filter(Boolean)

      const channels = [...chMap.entries()].map(([id, name]) => ({ id, name }))

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
  }
}
