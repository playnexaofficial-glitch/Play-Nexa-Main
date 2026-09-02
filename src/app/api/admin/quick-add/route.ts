import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { GoogleGenerativeAI } from '@google/generative-ai'


function extractVideoId(url: string) {
  const patterns = [
    /(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { url, category, prefilled } = await req.json()

    // Detect if user gave a channel URL instead of a video URL
    const urlStr = url?.trim() || ''
    const isChannelUrl =
      urlStr.includes('/@') ||
      urlStr.includes('/channel/') ||
      urlStr.includes('/user/') ||
      urlStr.includes('/c/')

    const hasVideoId =
      urlStr.includes('watch?v=') ||
      urlStr.includes('youtu.be/') ||
      urlStr.includes('/shorts/')

    if (isChannelUrl && !hasVideoId && !prefilled) {
      return NextResponse.json(
        {
          error:
            'This is a channel URL, not a video URL. Quick Add needs a video URL like: youtube.com/watch?v=VIDEO_ID. To browse and import from a channel, use the 🔍 Browse feature instead.',
        },
        { status: 400 }
      )
    }

    let videoId: string | null = null
    let title = ''
    let channelName = ''
    let channelId = ''
    let thumbnail = ''
    let description = ''

    if (prefilled) {
      videoId = prefilled.videoId
      title = prefilled.title
      channelName = prefilled.channelName
      channelId = prefilled.channelId
      thumbnail =
        prefilled.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
      description = (prefilled.description || '').slice(0, 300)
    } else {
      videoId = extractVideoId(url?.split('?si=')[0] || '')
      if (!videoId) {
        return NextResponse.json(
          { error: 'Invalid YouTube URL' },
          { status: 400 }
        )
      }

      // FREE oEmbed — no API key needed
      const oembed = await fetch(
        `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`,
        { signal: AbortSignal.timeout(8000) }
      )

      if (!oembed.ok) {
        return NextResponse.json(
          {
            error: 'Could not fetch video info. Check if video is public.',
          },
          { status: 404 }
        )
      }

      const info = await oembed.json()
      title = info.title || 'Unknown'
      channelName = info.author_name || ''
      thumbnail = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`

      // Extract channel ID from author_url
      const authorUrl = info.author_url || ''
      const cidMatch = authorUrl.match(/channel\/(UC[\w-]+)/)
      if (cidMatch) {
        channelId = cidMatch[1]
      } else {
        channelId = authorUrl
      }

      // Fetch real description via YouTube Data API v3
      const ytApiKey =
        process.env.YOUTUBE_API_KEY ||
        process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ||
        ''
      if (ytApiKey) {
        try {
          const ytRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${ytApiKey}`,
            { signal: AbortSignal.timeout(5000) }
          )
          if (ytRes.ok) {
            const ytData = await ytRes.json()
            const rawDesc = ytData.items?.[0]?.snippet?.description || ''
            description = rawDesc.slice(0, 300)
          }
        } catch {
          description = ''
        }
      }
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'Could not extract video ID' },
        { status: 400 }
      )
    }

    // Preview mode — just return info
    const isPreview = req.nextUrl.searchParams.get('preview') === 'true'

    // AI classify if category is 'auto'
    let finalCategory = category
    let aiSuggestion = 'movie'

    if (!category || category === 'auto') {
      try {
        const apiKey = process.env.GEMINI_API_KEY
        if (apiKey) {
          const genAI = new GoogleGenerativeAI(apiKey)
          const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
          })
          const res = await model.generateContent(
            `Classify: "${title}" by "${channelName}"
Reply ONLY one word: movie OR natok OR music OR skip`
          )
          const t = res.response.text().toLowerCase().trim()
          aiSuggestion = t.includes('music')
            ? 'music'
            : t.includes('natok')
            ? 'natok'
            : t.includes('movie')
            ? 'movie'
            : 'skip'
          if (!category || category === 'auto') {
            finalCategory = aiSuggestion
          }
        }
      } catch {}
    }

    if (isPreview) {
      return NextResponse.json({
        videoId,
        title,
        channelName,
        channelId,
        thumbnail,
        aiSuggestion,
      })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      )
    }

    // Check duplicates
    if (finalCategory === 'movie') {
      const { data: ex } = await supabaseAdmin
        .from('movies')
        .select('id,title')
        .eq('youtube_id', videoId)
        .maybeSingle()
      if (ex) {
        return NextResponse.json(
          { error: 'Already imported: ' + ex.title },
          { status: 409 }
        )
      }

      const { data, error } = await supabaseAdmin
        .from('movies')
        .insert([
          {
            youtube_id: videoId,
            title,
            thumbnail,
            channel_name: channelName,
            channel_id: channelId,
            is_hidden: false,
            description,
            published_at: new Date().toISOString(),
            content_type: 'movie',
          },
        ])
        .select('id')
        .single()
      if (error) throw error

      // Update channel_display
      await supabaseAdmin.from('channel_display').upsert(
        [
          {
            channel_id: channelId,
            display_name: channelName,
            logo_url: channelId
              ? `https://unavatar.io/youtube/${channelId}`
              : '',
            badge_color: '#7C3AED',
            border_color: '#7C3AED',
            is_visible: true,
            sort_order: 0,
          },
        ],
        { onConflict: 'channel_id' }
      )

      // After successful insert, log for notification system
      const contentType = finalCategory
      try {
        await supabaseAdmin.from('notifications_log').insert([{
          title: `New ${contentType} imported`,
          body: title,
          sent_to: 'pending',
          sent_count: 0,
          sent_at: new Date().toISOString(),
        }])
      } catch {}

      return NextResponse.json({
        success: true,
        title,
        category: 'movie',
        id: data?.id,
      })
    }

    if (finalCategory === 'natok') {
    const { data: ex } = await supabaseAdmin
      .from('movies')
      .select('id,title')
      .eq('youtube_id', videoId)
      .maybeSingle()
    if (ex) {
      return NextResponse.json(
        { error: 'Already imported: ' + ex.title },
        { status: 409 }
      )
    }
    const { data, error } = await supabaseAdmin
      .from('movies')
      .insert([{
        youtube_id: videoId,
        title,
        thumbnail,
        channel_name: channelName,
        channel_id: channelId,
        is_hidden: false,
        description,
        published_at: new Date().toISOString(),
        content_type: 'natok',
      }])
      .select('id')
      .single()
    if (error) throw error
    await supabaseAdmin
      .from('channel_display')
      .upsert([{
        channel_id: channelId,
        display_name: channelName,
        logo_url: channelId
          ? `https://unavatar.io/youtube/${channelId}`
          : '',
        badge_color: '#06B6D4',
        border_color: '#06B6D4',
        is_visible: true,
        sort_order: 0,
      }], { onConflict: 'channel_id' })
    return NextResponse.json({
      success: true,
      title,
      category: 'natok',
      id: data?.id,
    })
  }

  if (finalCategory === 'music') {
      const { data: ex } = await supabaseAdmin
        .from('music_tracks')
        .select('id,title')
        .eq('youtube_id', videoId)
        .maybeSingle()
      if (ex) {
        return NextResponse.json(
          { error: 'Already imported: ' + ex.title },
          { status: 409 }
        )
      }

      const { data, error } = await supabaseAdmin
        .from('music_tracks')
        .insert([
          {
            youtube_id: videoId,
            title,
            thumbnail,
            channel_name: channelName,
            channel_id: channelId,
            is_hidden: false,
            description,
            published_at: new Date().toISOString(),
          },
        ])
        .select('id')
        .single()
      if (error) throw error

      // After successful insert, log for notification system
      const contentType = finalCategory
      try {
        await supabaseAdmin.from('notifications_log').insert([{
          title: `New ${contentType} imported`,
          body: title,
          sent_to: 'pending',
          sent_count: 0,
          sent_at: new Date().toISOString(),
        }])
      } catch {}

      return NextResponse.json({
        success: true,
        title,
        category: 'music',
        id: data?.id,
      })
    }

    return NextResponse.json(
      { error: 'Video classified as skip' },
      { status: 422 }
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
