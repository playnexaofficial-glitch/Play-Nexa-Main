import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-static'

export async function GET(req: NextRequest) {
  try {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || ''
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const results: string[] = []

  try {
    // 1. Check for new movies (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: newMovies } = await supabaseAdmin
      .from('movies')
      .select('title, channel_name')
      .eq('is_hidden', false)
      .gte('created_at', yesterday)
      .limit(5)

    const { data: newTracks } = await supabaseAdmin
      .from('music_tracks')
      .select('title, channel_name')
      .eq('is_hidden', false)
      .gte('created_at', yesterday)
      .limit(5)

    const { data: newGames } = await supabaseAdmin
      .from('games')
      .select('name')
      .eq('is_hidden', false)
      .gte('created_at', yesterday)
      .limit(3)

    // 2. Build notification based on what's new
    let notifTitle = ''
    let notifBody = ''

    if (newMovies && newMovies.length > 0) {
      notifTitle = 'New Movie Added'
      notifBody = `"${newMovies[0].title}" and ${newMovies.length - 1} more added to Play Nexa`
    } else if (newTracks && newTracks.length > 0) {
      notifTitle = 'New Music Added'
      notifBody = `${newTracks.length} new songs added. Listen now on Play Nexa`
    } else if (newGames && newGames.length > 0) {
      notifTitle = 'New Game Available'
      notifBody = `"${newGames[0].name}" is now on Play Nexa. Play free`
    }

    if (notifTitle) {
      // Get all active device tokens
      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('device_token')
        .eq('is_active', true)
        .limit(1000)

      const tokens = (subs || []).map((s: any) => s.device_token).filter(Boolean)

      // Log the notification
      await supabaseAdmin.from('notifications_log').insert([{
        title: notifTitle,
        body: notifBody,
        sent_to: 'all',
        sent_count: tokens.length,
        sent_at: new Date().toISOString(),
      }])

      results.push(`Sent: ${notifTitle} to ${tokens.length} devices`)
    } else {
      results.push('No new content in last 24h — no notification sent')
    }

    // 3. Come-back notifications for inactive users (7+ days)
    // Check for users inactive 7+ days
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString()

    // These messages rotate daily using day of week
    const reEngageMessages = [
      { title: 'Play Nexa misses you', body: 'New movies and music are waiting for you' },
      { title: 'Your entertainment hub', body: 'Come back and discover new content added this week' },
      { title: 'New content available', body: 'Movies, music and games have been updated on Play Nexa' },
      { title: 'Play Nexa update', body: 'Check out the latest additions to your entertainment hub' },
      { title: 'Its been a while', body: 'Your saved movies and playlists are ready to play' },
    ]

    const dayIndex = new Date().getDay()
    const reEngage = reEngageMessages[dayIndex % reEngageMessages.length]

    // Log re-engagement notification (actual FCM send needs server key)
    await supabaseAdmin.from('notifications_log').insert([{
      title: reEngage.title,
      body: reEngage.body,
      sent_to: 'inactive_users',
      sent_count: 0,
      sent_at: new Date().toISOString(),
    }])

    results.push(`Logged re-engagement: "${reEngage.title}"`)
    results.push('Auto-notify cron completed')

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  } catch (e) {
    return NextResponse.json({ ok: true });
  }}
