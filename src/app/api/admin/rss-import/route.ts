import { NextRequest, NextResponse }
  from 'next/server'
import { supabaseAdmin }
  from '@/lib/supabaseAdmin'
import { GoogleGenerativeAI }
  from '@google/generative-ai'


function parseChannelId(url: string): string | null {
  const patterns = [
    /youtube\.com\/channel\/([UC][a-zA-Z0-9_-]{22})/,
    /youtube\.com\/@([a-zA-Z0-9_.-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_.-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_.-]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  // Direct channel ID
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(url.trim()))
    return url.trim()
  return null
}

async function resolveChannelId(
  input: string
): Promise<{
  channelId: string
  channelName: string
  avatar: string
} | null> {
  const raw = parseChannelId(input)
  if (!raw) return null

  // If it's already a UC... channel ID
  if (raw.startsWith('UC')) {
    const rss = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${raw}`,
      { signal: AbortSignal.timeout(8000) }
    ).catch(() => null)
    if (rss?.ok) {
      const xml = await rss.text()
      const name = xml.match(
        /<name>([^<]+)<\/name>/
      )?.[1] || 'Unknown Channel'
      return {
        channelId: raw,
        channelName: name.trim(),
        avatar: `https://unavatar.io/youtube/${raw}`,
      }
    }
    return null
  }

  // Handle @ or username — try oEmbed on channel page
  const channelUrl = input.includes('youtube.com')
    ? input
    : `https://www.youtube.com/@${raw}`
  const oembed = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(channelUrl)}&format=json`,
    { signal: AbortSignal.timeout(8000) }
  ).catch(() => null)

  if (oembed?.ok) {
    const data = await oembed.json()
    // Try RSS with handle
    const rssByHandle = await fetch(
      `https://www.youtube.com/feeds/videos.xml?user=${raw}`,
      { signal: AbortSignal.timeout(8000) }
    ).catch(() => null)
    if (rssByHandle?.ok) {
      const xml = await rssByHandle.text()
      const channelId = xml.match(
        /<yt:channelId>([^<]+)<\/yt:channelId>/
      )?.[1]
      if (channelId) {
        return {
          channelId,
          channelName: data.author_name || raw,
          avatar: `https://unavatar.io/youtube/${channelId}`,
        }
      }
    }
  }
  return null
}

function parseRSSVideos(xml: string): {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  viewCount: number
  channelId: string
  channelName: string
}[] {
  const videos: any[] = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  const channelId = xml.match(
    /<yt:channelId>([^<]+)<\/yt:channelId>/
  )?.[1] || ''
  const channelName = xml.match(
    /<name>([^<]+)<\/name>/
  )?.[1] || ''

  let m
  while ((m = entryRegex.exec(xml)) !== null) {
    const e = m[1]
    const videoId = e.match(
      /<yt:videoId>([^<]+)<\/yt:videoId>/
    )?.[1]
    const title = e.match(
      /<title>([^<]+)<\/title>/
    )?.[1]
      ?.replace(/&amp;/g, '&')
      ?.replace(/&lt;/g, '<')
      ?.replace(/&gt;/g, '>')
      ?.replace(/&quot;/g, '"')
      ?.trim()
    const pub = e.match(
      /<published>([^<]+)<\/published>/
    )?.[1]
    const thumb = e.match(
      /url="(https:\/\/i\.ytimg\.com[^"]+)"/
    )?.[1]
    const views = parseInt(
      e.match(
        /<media:statistics views="(\d+)"/
      )?.[1] || '0'
    )

    if (videoId && title) {
      videos.push({
        videoId: videoId.trim(),
        title,
        thumbnail: thumb ||
          `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        publishedAt: pub || new Date().toISOString(),
        viewCount: views,
        channelId: channelId.trim(),
        channelName: channelName.trim(),
      })
    }
  }
  return videos
}

function keywordClassify(
  title: string,
  channelName: string,
  channelType: string
): { type: string; confidence: number } {
  const text = `${title} ${channelName}`.toLowerCase()

  const skipWords = [
    'trailer', 'teaser', '#shorts', 'shorts',
    'interview', 'promo', 'preview', 'clip',
    'reaction', 'behind the scenes',
  ]
  if (skipWords.some(w => text.includes(w)))
    return { type: 'skip', confidence: 0.9 }

  const musicWords = [
    'official music video', 'music video',
    'audio', 'lyric', 'song', 'lyrics',
    'feat.', 'ft.', 'album', 'single',
  ]
  if (musicWords.some(w => text.includes(w)))
    return { type: 'music', confidence: 0.92 }

  const natokWords = [
    'নাটক', 'natok', 'telefilm', 'eid natok',
    'web series', 'drama serial', 'episode',
    ' ep ', 'ep.', 'part ', 'পর্ব',
    'full episode', 'bangla drama', 'serial',
    'mini series', 'short film',
  ]
  if (natokWords.some(w => text.includes(w)))
    return { type: 'natok', confidence: 0.88 }

  const movieWords = [
    'full movie', 'official movie', 'bengali movie',
    'bangla movie', 'hindi movie', 'bollywood',
    'hollywood', 'south movie', 'film',
    'চলচ্চিত্র', 'সিনেমা', 'মুভি',
  ]
  if (movieWords.some(w => text.includes(w)))
    return { type: 'movie', confidence: 0.85 }

  // Channel type default
  if (channelType === 'music')
    return { type: 'music', confidence: 0.6 }
  if (channelType === 'movies')
    return { type: 'movie', confidence: 0.55 }

  return { type: 'skip', confidence: 0.3 }
}

async function geminiVerify(
  title: string,
  channelName: string,
  apiKey: string
): Promise<{ type: string; confidence: number }> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    })
    const result = await model.generateContent(
      `Classify this YouTube video:
Title: "${title}"
Channel: "${channelName}"

Reply ONLY valid JSON, no markdown:
{"type":"movie","confidence":0.9}

Types: movie=full film, natok=drama/episode/series,
music=song/audio, skip=trailer/clip/shorts`
    )
    const text = result.response.text().trim()
    const json = text.match(/\{[\s\S]*?\}/)
    if (json) {
      const parsed = JSON.parse(json[0])
      if (parsed.type && parsed.confidence) {
        return parsed
      }
    }
  } catch {}
  return { type: 'skip', confidence: 0.3 }
}

export async function POST(req: NextRequest) {
  try {
    const {
      channelUrl,
      channelType = 'movies',
      useGemini = false,
    } = await req.json()

    if (!channelUrl) {
      return NextResponse.json(
        { error: 'channelUrl is required' },
        { status: 400 }
      )
    }

    // Step 1: Resolve channel
    const channel =
      await resolveChannelId(channelUrl)
    if (!channel) {
      return NextResponse.json(
        { error: 'Could not find channel. Check URL.' },
        { status: 400 }
      )
    }

    // Step 2: Fetch RSS
    const rssUrl =
      `https://www.youtube.com/feeds/videos.xml` +
      `?channel_id=${channel.channelId}`
    const rssRes = await fetch(rssUrl, {
      signal: AbortSignal.timeout(10000),
    })
    if (!rssRes.ok) {
      return NextResponse.json(
        { error: 'Could not fetch channel RSS' },
        { status: 502 }
      )
    }
    const xml = await rssRes.text()
    const videos = parseRSSVideos(xml)

    if (videos.length === 0) {
      return NextResponse.json(
        { error: 'No videos found in RSS' },
        { status: 404 }
      )
    }

    // Step 3: Get existing youtube_ids
    const [existingMovies, existingTracks] =
      await Promise.all([
        supabaseAdmin.from('movies')
          .select('youtube_id'),
        supabaseAdmin.from('music_tracks')
          .select('youtube_id'),
      ])
    const existing = new Set([
      ...(existingMovies.data || [])
        .map((m: any) => m.youtube_id),
      ...(existingTracks.data || [])
        .map((t: any) => t.youtube_id),
    ])

    const newVideos = videos.filter(
      v => !existing.has(v.videoId)
    )

    // Step 4: Get Gemini key if needed
    let geminiKey = ''
    if (useGemini) {
      const { data: keys } = await supabaseAdmin
        .from('gemini_keys')
        .select('api_key')
        .eq('is_active', true)
        .eq('status', 'active')
        .order('sort_order')
        .limit(1)
      geminiKey = keys?.[0]?.api_key ||
        process.env.GEMINI_API_KEY || ''
    }

    // Step 5: Classify and insert
    let moviesAdded = 0
    let natokAdded = 0
    let musicAdded = 0
    let skipped = 0
    const results: any[] = []

    for (const video of newVideos) {
      // Keyword classify first (fast, free)
      let classify = keywordClassify(
        video.title,
        channel.channelName,
        channelType
      )

      // If low confidence and Gemini available,
      // verify with AI
      if (
        classify.confidence < 0.7 &&
        useGemini &&
        geminiKey
      ) {
        const gemini = await geminiVerify(
          video.title,
          channel.channelName,
          geminiKey
        )
        if (gemini.confidence > classify.confidence) {
          classify = gemini
        }
      }

      if (classify.type === 'movie') {
        const { error } = await supabaseAdmin
          .from('movies')
          .insert([{
            youtube_id: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
            channel_name: channel.channelName,
            channel_id: channel.channelId,
            description: '',
            published_at: video.publishedAt,
            view_count: video.viewCount || 0,
            source_channel_id: channel.channelId,
            is_hidden: false,
            content_type: 'movie',
          }])
        if (!error || error.code === '23505') {
          moviesAdded++
          results.push({
            title: video.title,
            type: 'movie'
          })
        }
      } else if (classify.type === 'natok') {
        const { error } = await supabaseAdmin
          .from('movies')
          .insert([{
            youtube_id: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
            channel_name: channel.channelName,
            channel_id: channel.channelId,
            description: '',
            published_at: video.publishedAt,
            view_count: video.viewCount || 0,
            source_channel_id: channel.channelId,
            is_hidden: false,
            content_type: 'natok',
          }])
        if (!error || error.code === '23505') {
          natokAdded++
          results.push({
            title: video.title,
            type: 'natok'
          })
        }
      } else if (classify.type === 'music') {
        const { error } = await supabaseAdmin
          .from('music_tracks')
          .insert([{
            youtube_id: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
            channel_name: channel.channelName,
            channel_id: channel.channelId,
            description: '',
            published_at: video.publishedAt,
            view_count: video.viewCount || 0,
            source_channel_id: channel.channelId,
            is_hidden: false,
          }])
        if (!error || error.code === '23505') {
          musicAdded++
          results.push({
            title: video.title,
            type: 'music'
          })
        }
      } else {
        skipped++
      }
    }

    // Update channel_display
    await supabaseAdmin
      .from('channel_display')
      .upsert([{
        channel_id: channel.channelId,
        display_name: channel.channelName,
        logo_url: channel.avatar,
        badge_color: natokAdded > moviesAdded ? '#06B6D4' : '#7C3AED',
        border_color: natokAdded > moviesAdded ? '#06B6D4' : '#7C3AED',
        is_visible: true,
        sort_order: 0,
      }], { onConflict: 'channel_id' })

    // Save channel to yt_channels
    await supabaseAdmin
      .from('yt_channels')
      .upsert([{
        channel_id: channel.channelId,
        channel_name: channel.channelName,
        channel_url: channelUrl,
        channel_avatar: channel.avatar,
        channel_type: channelType,
        is_active: true,
        videos_imported:
          moviesAdded + natokAdded + musicAdded,
        rss_imported_count:
          moviesAdded + natokAdded + musicAdded,
        last_synced_at: new Date().toISOString(),
      }], { onConflict: 'channel_id' })

    return NextResponse.json({
      success: true,
      channel: {
        name: channel.channelName,
        id: channel.channelId,
      },
      totalFound: videos.length,
      newVideos: newVideos.length,
      imported: {
        movies: moviesAdded,
        natok: natokAdded,
        music: musicAdded,
        skipped,
      },
      results: results.slice(0, 20),
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Import failed' },
      { status: 500 }
    )
  }
}
