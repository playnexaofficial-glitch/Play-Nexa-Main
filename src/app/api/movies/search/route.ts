import { NextRequest, NextResponse }
  from 'next/server'
import { supabaseAdmin }
  from '@/lib/supabaseAdmin'


const SEARCH_FIELDS =
  'id,youtube_id,title,thumbnail,' +
  'channel_name,channel_id,' +
  'watch_count,created_at,content_type'

export async function GET(req: NextRequest) {
  try {
  const q = req.nextUrl.searchParams
    .get('q') || ''
  const type = req.nextUrl.searchParams
    .get('type') || 'all'

  if (!q.trim()) {
    return NextResponse.json({ results: [] })
  }

  const search = q.trim()

  try {
    // Run 3 searches in parallel
    const [r1, r2, r3] = await Promise.all([
      // Title match (highest priority)
      supabaseAdmin
        .from('movies')
        .select(SEARCH_FIELDS)
        .eq('is_hidden', false)
        .ilike('title', `%${search}%`)
        .order('watch_count', { ascending: false })
        .limit(15),

      // Channel name match
      supabaseAdmin
        .from('movies')
        .select(SEARCH_FIELDS)
        .eq('is_hidden', false)
        .ilike('channel_name', `%${search}%`)
        .order('watch_count', { ascending: false })
        .limit(8),

      // Description match
      supabaseAdmin
        .from('movies')
        .select(SEARCH_FIELDS)
        .eq('is_hidden', false)
        .ilike('description', `%${search}%`)
        .order('watch_count', { ascending: false })
        .limit(8),
    ])

    // Merge with deduplication
    const seen = new Set<string>()
    const merged: any[] = []
    const combined: any[] = [
      ...((r1.data as any[]) || []),
      ...((r2.data as any[]) || []),
      ...((r3.data as any[]) || []),
    ]

    for (const m of combined) {
      if (m?.id && !seen.has(String(m.id))) {
        seen.add(String(m.id))
        // Apply content_type filter if set
        if (type === 'all' ||
            m.content_type === type) {
          merged.push(m)
        }
      }
    }

    return NextResponse.json({
      results: merged,
      total: merged.length,
      query: search,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Search failed' },
      { status: 500 }
    )
  }

  } catch (e) {
    return NextResponse.json({ ok: true });
  }}

