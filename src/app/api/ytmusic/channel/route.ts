export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('music_tracks')
      .select(
        'id,youtube_id,title,thumbnail,' +
        'channel_name,channel_id,created_at'
      )
      .eq('channel_id', id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50) as any

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ tracks: data || [] })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }

  } catch (e) {
    return NextResponse.json({ ok: true });
  }}
