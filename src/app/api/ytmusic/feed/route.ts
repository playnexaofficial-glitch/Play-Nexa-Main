import { NextRequest, NextResponse }
  from 'next/server'
import { supabaseAdmin }
  from '@/lib/supabaseAdmin'


const T =
  'id,youtube_id,title,thumbnail,' +
  'channel_name,channel_id,created_at'

function shuffle<X>(a: X[]): X[] {
  const arr = [...a]
  for (let i = arr.length - 1; i > 0; i--) {
    const j =
      Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams
    const userId = p.get('userId') || null
    const mood = p.get('mood') || 'all'

    // ── Launch independent top-level queries ──
    const allTracksPromise = supabaseAdmin
      .from('music_tracks')
      .select('channel_id,channel_name')
      .eq('is_hidden', false)
      .limit(1000)

    const newRelPromise = supabaseAdmin
      .from('music_tracks')
      .select(T)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(10)

    // ── User signals ─────────────────────────
    let preferredChannels: string[] = []
    let likedChannels: string[] = []
    let playedIds = new Set<string>()
    let recentlyPlayed: any[] = []

    let userSignalsPromise: Promise<void> = Promise.resolve()

    if (userId) {
      userSignalsPromise = (async () => {
        // Fetch history and likes in parallel
        const [histRes, likesRes] = await Promise.all([
          supabaseAdmin
            .from('music_history')
            .select('track_id,played_at')
            .eq('user_id', userId)
            .order('played_at', { ascending: false })
            .limit(100),
          supabaseAdmin
            .from('music_likes')
            .select('track_id')
            .eq('user_id', userId)
            .limit(50),
        ])

        const hist = histRes.data
        const likes = likesRes.data

        const histIds = (hist || [])
          .map((h: any) => h.track_id)
          .filter(Boolean)
        playedIds = new Set(histIds)

        const lIds = (likes || [])
          .map((l: any) => l.track_id)
          .filter(Boolean)

        // Run affinity, likes, and recent queries in parallel
        const hTracksPromise = histIds.length > 0
          ? supabaseAdmin
              .from('music_tracks')
              .select('channel_id')
              .in('id', histIds)
              .eq('is_hidden', false)
          : Promise.resolve({ data: [] })

        const lTracksPromise = lIds.length > 0
          ? supabaseAdmin
              .from('music_tracks')
              .select('channel_id')
              .in('id', lIds)
              .eq('is_hidden', false)
          : Promise.resolve({ data: [] })

        const recentPromise = histIds.length > 0
          ? supabaseAdmin
              .from('music_tracks')
              .select(T)
              .in('id', histIds.slice(0, 10))
              .eq('is_hidden', false)
          : Promise.resolve({ data: [] })

        const [{ data: hTracks }, { data: lTracks }, { data: recent }] = await Promise.all([
          hTracksPromise,
          lTracksPromise,
          recentPromise,
        ]) as any[]

        // Channel affinity
        if (hTracks && hTracks.length > 0) {
          const cc: Record<string, number> = {}
          for (const t of hTracks) {
            cc[t.channel_id] = (cc[t.channel_id] || 0) + 1
          }
          preferredChannels = Object.entries(cc)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([id]) => id)
        }

        // Like signals
        if (lTracks && lTracks.length > 0) {
          const lChs = new Set<string>(lTracks.map((t: any) => String(t.channel_id || '')).filter(Boolean))
          likedChannels = Array.from(lChs).slice(0, 4)
        }

        // Recently played tracks
        if (recent && recent.length > 0) {
          const idxMap = new Map(
            histIds.map((id: string, i: number) => [id, i])
          )
          recentlyPlayed = (recent as any[])
            .sort((a, b) => (idxMap.get(a.id) ?? 99) - (idxMap.get(b.id) ?? 99))
        }
      })()
    }

    // Wait for user signals before calculating Quick Picks (if mood==='all') and Recommendations
    await userSignalsPromise

    // ── Quick Picks ──────────────────────────
    let quickPicks: any[] = []

    if (mood === 'all') {
      if (preferredChannels.length > 0) {
        const [r1, r2] = await Promise.all([
          supabaseAdmin
            .from('music_tracks')
            .select(T)
            .eq('is_hidden', false)
            .in('channel_id', preferredChannels)
            .order('created_at', { ascending: false })
            .limit(12),
          supabaseAdmin
            .from('music_tracks')
            .select(T)
            .eq('is_hidden', false)
            .not('channel_id', 'in', `(${preferredChannels.join(',')})`)
            .order('created_at', { ascending: false })
            .limit(8),
        ])
        const seen = new Set<string>()
        for (const t of shuffle([
          ...(r1.data || []),
          ...(r2.data || []),
        ]) as any[]) {
          if (!seen.has(t.id)) {
            seen.add(t.id)
            quickPicks.push(t)
          }
          if (quickPicks.length >= 20) break
        }
      } else {
        const { data } = await supabaseAdmin
          .from('music_tracks')
          .select(T)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(20)
        quickPicks = shuffle(data || [])
      }
    } else if (mood === 'new') {
      const ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabaseAdmin
        .from('music_tracks')
        .select(T)
        .eq('is_hidden', false)
        .gte('created_at', ago)
        .order('created_at', { ascending: false })
        .limit(20)
      quickPicks = data || []
      if (quickPicks.length < 5) {
        const { data: fallback } = await supabaseAdmin
          .from('music_tracks')
          .select(T)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(20)
        quickPicks = fallback || []
      }
    } else if (mood === 'hot') {
      const { data } = await supabaseAdmin
        .from('music_tracks')
        .select(T + ',view_count')
        .eq('is_hidden', false)
        .order('view_count', { ascending: false })
        .limit(20)
      quickPicks = data || []
      if (quickPicks.length < 5) {
        const { data: fb } = await supabaseAdmin
          .from('music_tracks')
          .select(T)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(20)
      quickPicks = fb || []
      }
    } else {
      const moodMap: Record<string, string> = {
        bangla: 'bangla',
        hindi: 'hindi',
        happy: 'happy',
        sad: 'sad',
        romantic: 'romantic',
        lofi: 'lofi',
        remix: 'remix',
      }
      const w = moodMap[mood] || mood
      const [r1, r2] = await Promise.all([
        supabaseAdmin
          .from('music_tracks')
          .select(T)
          .eq('is_hidden', false)
          .ilike('title', `%${w}%`)
          .limit(14),
        supabaseAdmin
          .from('music_tracks')
          .select(T)
          .eq('is_hidden', false)
          .ilike('channel_name', `%${w}%`)
          .limit(8),
      ])
      const seen = new Set<string>()
      for (const t of [
        ...(r1.data || []),
        ...(r2.data || []),
      ] as any[]) {
        if (!seen.has(t.id)) {
          seen.add(t.id)
          quickPicks.push(t)
        }
      }
    }

    // ── Await allTracks and newRel ─────────────────────
    const [{ data: allTracks }, { data: newRel }] = await Promise.all([
      allTracksPromise,
      newRelPromise,
    ])

    const chMap = new Map<string, {
      channel_id: string
      channel_name: string
      count: number
    }>()
    for (const t of (allTracks || []) as any[]) {
      if (!t.channel_id) continue
      if (!chMap.has(t.channel_id)) {
        chMap.set(t.channel_id, {
          channel_id: t.channel_id,
          channel_name: t.channel_name,
          count: 0,
        })
      }
      chMap.get(t.channel_id)!.count++
    }

    // Top channels: liked/preferred first
    const allChs = [...chMap.values()]
    const topChannels = [
      ...allChs.filter(c =>
        likedChannels.includes(c.channel_id) ||
        preferredChannels.includes(c.channel_id)
      ).sort((a, b) => b.count - a.count),
      ...allChs.filter(c =>
        !likedChannels.includes(c.channel_id) &&
        !preferredChannels.includes(c.channel_id)
      ).sort((a, b) => b.count - a.count),
    ].slice(0, 10)

    // ── Channel rows (Parallelized queries) ─────────────
    const orderedChs = [
      ...allChs.filter(c => preferredChannels.includes(c.channel_id)),
      ...allChs.filter(c => !preferredChannels.includes(c.channel_id)),
    ].sort((a, b) => b.count - a.count)
     .slice(0, 8)

    const channelRowPromises = orderedChs.map(async (ch) => {
      const { data: chT } = await supabaseAdmin
        .from('music_tracks')
        .select(T)
        .eq('is_hidden', false)
        .eq('channel_id', ch.channel_id)
        .order('created_at', { ascending: false })
        .limit(8)
      if (chT && chT.length > 0) {
        return {
          channelId: ch.channel_id,
          channelName: ch.channel_name,
          tracks: chT,
        }
      }
      return null
    })

    // ── Recommended Query ───────────────────
    const allPref = [...new Set([
      ...preferredChannels,
      ...likedChannels,
    ])]

    const recommendedPromise = (async () => {
      let recResult: any[] = []
      if (allPref.length > 0) {
        const { data: rec } = await supabaseAdmin
          .from('music_tracks')
          .select(T)
          .eq('is_hidden', false)
          .in('channel_id', allPref)
          .order('created_at', { ascending: false })
          .limit(40)
        const unplayed = ((rec || []) as any[]).filter(t => !playedIds.has(t.id))
        const played = ((rec || []) as any[]).filter(t => playedIds.has(t.id))
        recResult = shuffle([
          ...unplayed.slice(0, 12),
          ...played.slice(0, 4),
        ]).slice(0, 16)
      }

      if (recResult.length < 4) {
        const { data: fb } = await supabaseAdmin
          .from('music_tracks')
          .select(T)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(20)
        recResult = shuffle(fb || []).slice(0, 16)
      }
      return recResult
    })()

    const [channelRowsResults, recommended] = await Promise.all([
      Promise.all(channelRowPromises),
      recommendedPromise,
    ])

    const channelRows = channelRowsResults.filter(Boolean)

    return NextResponse.json({
      quickPicks,
      topChannels,
      channelRows,
      newReleases: newRel || [],
      recommended,
      recentlyPlayed,
    }, {
      headers: {
        'Cache-Control':
          's-maxage=60, stale-while-revalidate=300'
      }
    })

  } catch (e) {
    return NextResponse.json({ ok: true });
  }
}
