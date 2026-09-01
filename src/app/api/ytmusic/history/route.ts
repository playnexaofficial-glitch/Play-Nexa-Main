import { NextRequest, NextResponse }
  from 'next/server'
import { supabaseAdmin }
  from '@/lib/supabaseAdmin'


export async function POST(req: NextRequest) {
  try {
    const { userId, trackId, youtubeId } =
      await req.json()
    if (!userId || !trackId) {
      return NextResponse.json(
        { error: 'userId and trackId required' },
        { status: 400 }
      )
    }
    await supabaseAdmin
      .from('music_history')
      .insert([{
        user_id: userId,
        track_id: trackId,
        youtube_id: youtubeId || null,
        played_at: new Date().toISOString(),
      }])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed' }, { status: 500 })
  }
}
