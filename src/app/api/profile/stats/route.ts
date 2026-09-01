import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-static'

export async function GET(req: NextRequest) {
  try {
  const userId = req.nextUrl.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({
      saved: 0,
      played: 0,
      liked: 0,
      isAdmin: false,
    })
  }

  try {
    const [
      { count: saved },
      { count: played },
      { count: movieLikes },
      { count: musicLikes },
      { data: adminData },
    ] = await Promise.all([
      supabaseAdmin
        .from('user_watchlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabaseAdmin
        .from('user_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabaseAdmin
        .from('user_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabaseAdmin
        .from('music_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabaseAdmin
        .from('admin_users')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    return NextResponse.json({
      saved: saved ?? 0,
      played: played ?? 0,
      liked: (movieLikes ?? 0) + (musicLikes ?? 0),
      isAdmin: !!adminData,
    })
  } catch (err: any) {
    return NextResponse.json({
      saved: 0,
      played: 0,
      liked: 0,
      isAdmin: false,
      error: err.message,
    })
  }

  } catch (e) {
    return NextResponse.json({ ok: true });
  }}
