import { NextRequest, NextResponse }
  from 'next/server'
import { supabaseAdmin }
  from '@/lib/supabaseAdmin'


export async function GET(req: NextRequest) {
  try {
  const userId =
    req.nextUrl.searchParams.get('userId')
  const trackId =
    req.nextUrl.searchParams.get('trackId')

  if (!userId || !trackId) {
    return NextResponse.json({ liked: false })
  }

  const { data } = await supabaseAdmin
    .from('music_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('track_id', trackId)
    .maybeSingle()

  return NextResponse.json({ liked: !!data })

  } catch (e) {
    return NextResponse.json({ ok: true });
  }}

export async function POST(req: NextRequest) {
  try {
    const {
      userId, trackId, youtubeId, action
    } = await req.json()

    if (!userId || !trackId) {
      return NextResponse.json(
        { error: 'userId and trackId required' },
        { status: 400 }
      )
    }

    if (action === 'like') {
      await supabaseAdmin
        .from('music_likes')
        .upsert([{
          user_id: userId,
          track_id: trackId,
          youtube_id: youtubeId || null,
        }], { onConflict: 'user_id,track_id' })
      return NextResponse.json({ liked: true })
    } else {
      await supabaseAdmin
        .from('music_likes')
        .delete()
        .eq('user_id', userId)
        .eq('track_id', trackId)
      return NextResponse.json({ liked: false })
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message }, { status: 500 })
  }
}
