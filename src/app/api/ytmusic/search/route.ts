import { NextRequest, NextResponse }
  from 'next/server'
import { supabaseAdmin }
  from '@/lib/supabaseAdmin'


const FIELDS =
  'id,youtube_id,title,thumbnail,' +
  'channel_name,channel_id,created_at'

export async function GET(req: NextRequest) {
  try {
  const q = req.nextUrl.searchParams
    .get('q') || ''

  if (!q.trim()) {
    return NextResponse.json({ results: [] })
  }

  const search = q.trim()

  try {
    const [r1, r2, r3] = await Promise.all([
      // Title match
      supabaseAdmin
        .from('music_tracks')
        .select(FIELDS)
        .eq('is_hidden', false)
        .ilike('title', `%${search}%`)
        .order('view_count', { ascending: false })
        .limit(15),

      // Channel name match
      supabaseAdmin
        .from('music_tracks')
        .select(FIELDS)
        .eq('is_hidden', false)
        .ilike('channel_name', `%${search}%`)
        .limit(8),

      // Description match
      supabaseAdmin
        .from('music_tracks')
        .select(FIELDS)
        .eq('is_hidden', false)
        .ilike('description', `%${search}%`)
        .limit(5),
    ])

    const seen = new Set<string>()
    const merged: any[] = []
    const allResults: any[] = [
      ...((r1.data as any[]) || []),
      ...((r2.data as any[]) || []),
      ...((r3.data as any[]) || []),
    ]
    for (const m of allResults) {
      if (m?.id && !seen.has(String(m.id))) {
        seen.add(String(m.id))
        merged.push(m)
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
