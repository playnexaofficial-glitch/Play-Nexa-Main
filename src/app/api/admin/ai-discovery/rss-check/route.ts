import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ─── Gemini Key Rotation Helpers ───

async function getActiveGeminiKey(): Promise<{ key: string; id: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { key: process.env.GEMINI_API_KEY || '', id: null }
    }

    const { data: activeKey } = await supabaseAdmin
      .from('gemini_keys')
      .select('id, api_key, quota_used')
      .eq('is_active', true)
      .maybeSingle()

    if (activeKey?.api_key) {
      return { key: activeKey.api_key, id: activeKey.id }
    }
  } catch (e) {
    console.error('Error fetching Gemini key from DB:', e)
  }

  return { key: process.env.GEMINI_API_KEY || '', id: null }
}

async function incrementGeminiKeyUsage(keyId: string | null) {
  if (!keyId || !supabaseAdmin) return
  try {
    const { data: current } = await supabaseAdmin
      .from('gemini_keys')
      .select('usage_count, quota_used')
      .eq('id', keyId)
      .single()

    if (current) {
      const newQuota = Math.min(100, (current.quota_used || 0) + 1)
      await supabaseAdmin
        .from('gemini_keys')
        .update({
          usage_count: (current.usage_count || 0) + 1,
          quota_used: newQuota,
          last_used: new Date().toISOString(),
        })
        .eq('id', keyId)
    }
  } catch (e) {
    console.error('Error updating Gemini key usage:', e)
  }
}

// ─── Duration & RSS XML Parsing Helpers ───

function parseDurationToMinutes(iso8601Duration: string | undefined): number {
  if (!iso8601Duration) return 0
  const match = iso8601Duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)
  return hours * 60 + minutes + Math.round(seconds / 60)
}

interface RSSEntry {
  videoId: string
  title: string
  publishedAt: string
  description: string
}

function parseYouTubeRss(xml: string): RSSEntry[] {
  const entries: RSSEntry[] = []
  const entryRegex = /<entry[\s\S]*?<\/entry>/g
  const matches = xml.match(entryRegex) || []

  for (const entryStr of matches) {
    const videoIdMatch =
      entryStr.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i) ||
      entryStr.match(/<id>yt:video:([^<]+)<\/id>/i)
    const titleMatch = entryStr.match(/<title>([^<]*)<\/title>/i)
    const publishedMatch = entryStr.match(/<published>([^<]+)<\/published>/i)
    const descMatch = entryStr.match(/<media:description>([\s\S]*?)<\/media:description>/i)

    if (videoIdMatch && videoIdMatch[1]) {
      const vId = videoIdMatch[1].trim()
      let rawTitle = titleMatch ? titleMatch[1] : ''
      rawTitle = rawTitle
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .trim()

      const published = publishedMatch ? publishedMatch[1].trim() : new Date().toISOString()
      const desc = descMatch ? descMatch[1].trim().slice(0, 300) : ''

      entries.push({
        videoId: vId,
        title: rawTitle,
        publishedAt: published,
        description: desc,
      })
    }
  }
  return entries
}

// ─── Classification Helpers ───

function fallbackClassifyVideo(
  title: string,
  description: string,
  durationMinutes: number,
  channelType: string
): 'MOVIE' | 'NATOK' | 'MUSIC' | 'SKIP' {
  const text = `${title} ${description}`.toLowerCase()

  const skipWords = [
    'trailer',
    'teaser',
    '#shorts',
    'shorts',
    'interview',
    'promo',
    'preview',
    'clip',
    'behind the scenes',
    'making of',
    'official trailer',
    'sneak peek',
    'reaction',
    'review',
    'news',
    'highlights',
  ]
  if (skipWords.some((w) => text.includes(w))) return 'SKIP'

  const natokWords = [
    'নাটক',
    'natok',
    'telefilm',
    'eid natok',
    'eid special',
    'web series',
    'drama serial',
    'episode',
    ' ep ',
    'ep.',
    'পর্ব',
    'full episode',
    'bangla drama',
    'serial',
    'mini series',
  ]
  if (natokWords.some((w) => text.includes(w))) return 'NATOK'

  const movieWords = [
    'full movie',
    'official movie',
    'bangla movie',
    'bengali movie',
    'full film',
    'hindi movie',
    'dubbed movie',
    'dubbed full',
    'bollywood',
    'hollywood',
    'south movie',
    'tamil movie',
    'telugu movie',
    'punjabi movie',
    'চলচ্চিত্র',
    'সিনেমা',
    'মুভি',
    'full cinema',
  ]
  if (movieWords.some((w) => text.includes(w))) return 'MOVIE'

  const musicWords = [
    'official song',
    'official audio',
    'music video',
    'lyrics',
    'audio song',
    'new song',
    'full song',
    'official music',
    'video song',
    'music album',
    'bhangra',
    'coke studio',
    'soundtrack',
    'ost',
    'remix',
  ]
  if (musicWords.some((w) => text.includes(w))) return 'MUSIC'

  if (
    channelType === 'music' ||
    (durationMinutes > 0 && durationMinutes < 10 && durationMinutes >= 1)
  ) {
    return 'MUSIC'
  }

  if (channelType === 'movies' || durationMinutes >= 20) {
    return 'MOVIE'
  }

  return 'SKIP'
}

async function classifyVideoBatchWithGemini(
  videos: Array<{
    videoId: string
    title: string
    description: string
    durationMinutes: number
  }>,
  channelType: string,
  geminiKey: string | null,
  geminiKeyId: string | null
): Promise<Map<string, 'MOVIE' | 'NATOK' | 'MUSIC' | 'SKIP'>> {
  const resultMap = new Map<string, 'MOVIE' | 'NATOK' | 'MUSIC' | 'SKIP'>()

  if (!geminiKey || videos.length === 0) {
    for (const v of videos) {
      resultMap.set(
        v.videoId,
        fallbackClassifyVideo(
          v.title,
          v.description,
          v.durationMinutes,
          channelType
        )
      )
    }
    return resultMap
  }

  const CHUNK_SIZE = 10
  for (let i = 0; i < videos.length; i += CHUNK_SIZE) {
    const chunk = videos.slice(i, i + CHUNK_SIZE)
    try {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      const prompt = `Classify these YouTube videos into exactly ONE of: MOVIE, NATOK, MUSIC, SKIP.
Channel Type: ${channelType}

Classification Guide:
- MOVIE: Full-length movies, cinema, or feature films across any language (Bangla, Hindi, English, Tamil, Telugu, etc.).
- NATOK: Bangla/Hindi/Urdu drama serial episodes, natok, telefilms, or web series episodes.
- MUSIC: Songs, official music videos, lyric videos, audio tracks, or music mixes.
- SKIP: Trailers, teasers, shorts, interviews, promos, previews, clips, behind the scenes, reactions, news.

Duration guidance:
- Movies & Natok are typically longer content (~20+ minutes), but short films or single episodes can be shorter.
- Music is typically shorter individual songs (2-7 mins) or long DJ mixes.
- NOTE: Weigh the title and description meaning MORE than duration alone. Use duration as a secondary supporting signal.

Videos to classify:
${chunk
  .map(
    (v, idx) =>
      `${idx + 1}. Title: "${v.title}"\n   Duration: ${v.durationMinutes} minutes\n   Desc: "${v.description.slice(0, 300)}"`
  )
  .join('\n')}

Reply in this strict format for each video (one per line, nothing else):
index:CLASSIFICATION
Example:
1:MOVIE
2:NATOK
3:MUSIC
4:SKIP`

      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const lines = text.trim().split('\n')

      for (const line of lines) {
        const match = line.match(/(\d+)\s*:\s*(MOVIE|NATOK|MUSIC|SKIP)/i)
        if (match) {
          const idx = parseInt(match[1], 10) - 1
          if (idx >= 0 && idx < chunk.length) {
            resultMap.set(chunk[idx].videoId, match[2].toUpperCase() as any)
          }
        }
      }

      await incrementGeminiKeyUsage(geminiKeyId)
    } catch (err: any) {
      console.error('Gemini RSS classification error:', err.message)
    }

    for (const v of chunk) {
      if (!resultMap.has(v.videoId)) {
        resultMap.set(
          v.videoId,
          fallbackClassifyVideo(
            v.title,
            v.description,
            v.durationMinutes,
            channelType
          )
        )
      }
    }
  }

  return resultMap
}

// ── GET — RSS New Upload Detection Cron Worker ──
export async function GET(req: NextRequest) {
  try {
    // 1. Verify cron secret (matches auto-notify and run pattern)
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || ''
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      )
    }

    // 2. Fetch current ai_discovery_state
    let { data: state, error: stateErr } = await supabaseAdmin
      .from('ai_discovery_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (stateErr && stateErr.code !== 'PGRST116') {
      throw stateErr
    }

    if (!state) {
      return NextResponse.json({
        success: true,
        message: 'ai_discovery_state not initialized yet',
      })
    }

    // Check if engine is enabled
    if (state.is_enabled === false) {
      return NextResponse.json({
        success: true,
        message: 'AI Auto-Discovery Engine is currently disabled',
        isEnabled: false,
      })
    }

    // 3. Quota reset check
    const todayStr = new Date().toISOString().split('T')[0]
    let youtubeUnits = state.daily_youtube_units_used || 0
    let geminiCalls = state.daily_gemini_calls_used || 0
    let videosImportedToday = state.videos_imported_today || 0

    if (state.quota_reset_date !== todayStr) {
      youtubeUnits = 0
      geminiCalls = 0
      videosImportedToday = 0
      await supabaseAdmin
        .from('ai_discovery_state')
        .update({
          daily_youtube_units_used: 0,
          daily_gemini_calls_used: 0,
          channels_found_today: 0,
          videos_imported_today: 0,
          quota_reset_date: todayStr,
        })
        .eq('id', 1)
      state.quota_reset_date = todayStr
    }

    const ytKey =
      process.env.YOUTUBE_API_KEY ||
      process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ||
      ''

    // 4. Query up to 20 AI-discovered & fully completed channels
    let channels: any[] = []
    const { data: orderedData, error: chErr } = await supabaseAdmin
      .from('yt_channels')
      .select('*')
      .eq('discovered_by_ai', true)
      .eq('import_phase_status', 'completed')
      .order('last_rss_checked_at', { ascending: true, nullsFirst: true })
      .limit(20)

    if (chErr) {
      // If last_rss_checked_at column does not exist yet before migration, fallback
      const { data: fallbackData, error: fbErr } = await supabaseAdmin
        .from('yt_channels')
        .select('*')
        .eq('discovered_by_ai', true)
        .eq('import_phase_status', 'completed')
        .order('last_synced_at', { ascending: true })
        .limit(20)

      if (fbErr) {
        throw fbErr
      }
      channels = fallbackData || []
    } else {
      channels = orderedData || []
    }

    if (channels.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No completed AI-discovered channels found to check via RSS',
        checkedCount: 0,
        newVideosFound: 0,
      })
    }

    let totalChannelsChecked = 0
    let totalNewVideosFound = 0
    let totalMoviesAdded = 0
    let totalNatokAdded = 0
    let totalMusicAdded = 0

    const { key: geminiKey, id: geminiKeyId } = await getActiveGeminiKey()

    // 5. Check RSS feed for each channel
    for (const channel of channels) {
      totalChannelsChecked++
      const channelNow = new Date().toISOString()

      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channel_id}`
        const rssRes = await fetch(rssUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PlayNexa/1.0)',
          },
          signal: AbortSignal.timeout(10000),
        })

        if (!rssRes.ok) {
          // Update timestamp so channel is not immediately stuck at top of queue
          await updateChannelRssTimestamp(channel.id, channelNow)
          continue
        }

        const xml = await rssRes.text()
        const entries = parseYouTubeRss(xml)

        if (entries.length === 0) {
          await updateChannelRssTimestamp(channel.id, channelNow)
          continue
        }

        const scannedIds: string[] = Array.isArray(channel.scanned_video_ids)
          ? channel.scanned_video_ids
          : []

        // Filter out videos already recorded as scanned
        const unscannedEntries = entries.filter(
          (e) => !scannedIds.includes(e.videoId)
        )

        if (unscannedEntries.length === 0) {
          await updateChannelRssTimestamp(channel.id, channelNow)
          continue
        }

        // Check if any of these unscanned video IDs exist in movies or music_tracks
        const vIdsToCheck = unscannedEntries.map((e) => e.videoId)
        const [{ data: exMovies }, { data: exMusic }] = await Promise.all([
          supabaseAdmin
            .from('movies')
            .select('youtube_id')
            .in('youtube_id', vIdsToCheck),
          supabaseAdmin
            .from('music_tracks')
            .select('youtube_id')
            .in('youtube_id', vIdsToCheck),
        ])

        const existingSet = new Set([
          ...(exMovies || []).map((m: any) => m.youtube_id),
          ...(exMusic || []).map((m: any) => m.youtube_id),
        ])

        const brandNewVideos = unscannedEntries.filter(
          (e) => !existingSet.has(e.videoId)
        )

        // All entries from feed should be added to scanned list to avoid re-checking
        const updatedScannedIds = Array.from(
          new Set([...scannedIds, ...entries.map((e) => e.videoId)])
        )

        if (brandNewVideos.length === 0) {
          await updateChannelScannedIds(channel.id, updatedScannedIds, channelNow)
          continue
        }

        // We found genuinely new uploads!
        totalNewVideosFound += brandNewVideos.length

        // Fetch durations & details via videos.list if API key is present & within quota
        const videosWithDetails = brandNewVideos.map((v) => ({
          videoId: v.videoId,
          title: v.title,
          description: v.description,
          publishedAt: v.publishedAt,
          thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          durationRaw: '',
          durationMinutes: 0,
        }))

        if (ytKey && youtubeUnits + 1 <= 9000) {
          try {
            const vIdsStr = brandNewVideos.map((v) => v.videoId).join(',')
            const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${vIdsStr}&key=${ytKey}`
            const vRes = await fetch(vUrl)
            const vData = await vRes.json()
            youtubeUnits += 1

            if (vData.items && Array.isArray(vData.items)) {
              const detailsMap = new Map<string, any>()
              for (const item of vData.items) {
                detailsMap.set(item.id, item)
              }

              for (const v of videosWithDetails) {
                const detail = detailsMap.get(v.videoId)
                if (detail) {
                  v.durationRaw = detail.contentDetails?.duration || ''
                  v.durationMinutes = parseDurationToMinutes(v.durationRaw)
                  if (detail.snippet?.title) v.title = detail.snippet.title
                  if (detail.snippet?.description) {
                    v.description = detail.snippet.description.slice(0, 300)
                  }
                  if (
                    detail.snippet?.thumbnails?.medium?.url ||
                    detail.snippet?.thumbnails?.high?.url
                  ) {
                    v.thumbnail =
                      detail.snippet?.thumbnails?.medium?.url ||
                      detail.snippet?.thumbnails?.high?.url
                  }
                }
              }
            }
          } catch (detailErr: any) {
            console.error('RSS detail fetch error:', detailErr.message)
          }
        }

        // Classify new videos
        const classifications = await classifyVideoBatchWithGemini(
          videosWithDetails,
          channel.channel_type || 'movies',
          geminiKey,
          geminiKeyId
        )

        if (geminiKey) {
          geminiCalls += Math.ceil(videosWithDetails.length / 10)
        }

        let channelMoviesAdded = 0
        let channelNatokAdded = 0
        let channelMusicAdded = 0

        for (const video of videosWithDetails) {
          const classification = classifications.get(video.videoId) || 'SKIP'

          if (classification === 'SKIP') {
            continue
          }

          if (classification === 'MOVIE' || classification === 'NATOK') {
            const contentType = classification === 'NATOK' ? 'natok' : 'movie'
            const { error: insErr } = await supabaseAdmin.from('movies').insert([
              {
                youtube_id: video.videoId,
                title: video.title,
                thumbnail: video.thumbnail,
                channel_name: channel.channel_name,
                channel_id: channel.channel_id,
                description: video.description || '',
                duration: video.durationRaw || '',
                published_at: video.publishedAt,
                view_count: 0,
                source_channel_id: channel.id,
                is_hidden: false,
                content_type: contentType,
                created_at: new Date().toISOString(),
              },
            ])

            if (!insErr) {
              if (contentType === 'natok') {
                channelNatokAdded++
                totalNatokAdded++
              } else {
                channelMoviesAdded++
                totalMoviesAdded++
              }
              videosImportedToday++

              await supabaseAdmin.from('ai_discovery_log').insert([
                {
                  event_type: 'rss_new_upload_found',
                  message: `New ${contentType} uploaded to "${channel.channel_name}": "${video.title}"`,
                  channel_id: channel.channel_id,
                },
              ])
            }
          } else if (classification === 'MUSIC') {
            const { error: insErr } = await supabaseAdmin
              .from('music_tracks')
              .insert([
                {
                  youtube_id: video.videoId,
                  title: video.title,
                  thumbnail: video.thumbnail,
                  channel_name: channel.channel_name,
                  channel_id: channel.channel_id,
                  description: video.description || '',
                  published_at: video.publishedAt,
                  view_count: 0,
                  source_channel_id: channel.id,
                  is_hidden: false,
                  created_at: new Date().toISOString(),
                },
              ])

            if (!insErr) {
              channelMusicAdded++
              totalMusicAdded++
              videosImportedToday++

              await supabaseAdmin.from('ai_discovery_log').insert([
                {
                  event_type: 'rss_new_upload_found',
                  message: `New music track uploaded to "${channel.channel_name}": "${video.title}"`,
                  channel_id: channel.channel_id,
                },
              ])
            }
          }
        }

        const channelTotalAdded =
          channelMoviesAdded + channelNatokAdded + channelMusicAdded

        // Update channel stats and timestamp
        await updateChannelFullRssStatus(
          channel.id,
          updatedScannedIds,
          (channel.videos_imported || 0) + channelTotalAdded,
          channelNow
        )

        // Update channel_display if any new media was imported
        if (channelTotalAdded > 0) {
          await supabaseAdmin.from('channel_display').upsert(
            [
              {
                channel_id: channel.channel_id,
                display_name: channel.channel_name,
                logo_url: channel.channel_avatar || '',
                badge_color:
                  channelNatokAdded > channelMoviesAdded
                    ? '#06B6D4'
                    : '#7C3AED',
                border_color:
                  channelNatokAdded > channelMoviesAdded
                    ? '#06B6D4'
                    : '#7C3AED',
                is_visible: true,
                sort_order: 0,
              },
            ],
            { onConflict: 'channel_id' }
          )
        }
      } catch (channelErr: any) {
        console.error(
          `Error checking RSS for channel ${channel.channel_id}:`,
          channelErr.message
        )
      }
    }

    // 6. Summary logging if no new uploads were found
    if (totalNewVideosFound === 0) {
      await supabaseAdmin.from('ai_discovery_log').insert([
        {
          event_type: 'rss_check_summary',
          message: `RSS check completed: ${totalChannelsChecked} channels checked, 0 new uploads found.`,
        },
      ])
    }

    // 7. Update ai_discovery_state
    await supabaseAdmin
      .from('ai_discovery_state')
      .update({
        daily_youtube_units_used: youtubeUnits,
        daily_gemini_calls_used: geminiCalls,
        videos_imported_today: videosImportedToday,
        quota_reset_date: todayStr,
        last_run_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    return NextResponse.json({
      success: true,
      channelsChecked: totalChannelsChecked,
      newVideosFound: totalNewVideosFound,
      moviesAdded: totalMoviesAdded,
      natokAdded: totalNatokAdded,
      musicAdded: totalMusicAdded,
      youtubeUnitsUsedToday: youtubeUnits,
      geminiCallsUsedToday: geminiCalls,
      videosImportedToday,
    })
  } catch (err: any) {
    console.error('RSS check worker error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── Database Fallback Helpers for last_rss_checked_at ──

async function updateChannelRssTimestamp(channelId: string, timestamp: string) {
  if (!supabaseAdmin) return
  const payload: any = {
    last_synced_at: timestamp,
    last_rss_checked_at: timestamp,
  }

  const { error } = await supabaseAdmin
    .from('yt_channels')
    .update(payload)
    .eq('id', channelId)

  if (error && error.message?.includes('last_rss_checked_at')) {
    delete payload.last_rss_checked_at
    await supabaseAdmin
      .from('yt_channels')
      .update(payload)
      .eq('id', channelId)
  }
}

async function updateChannelScannedIds(
  channelId: string,
  scannedIds: string[],
  timestamp: string
) {
  if (!supabaseAdmin) return
  const payload: any = {
    scanned_video_ids: scannedIds,
    last_synced_at: timestamp,
    last_rss_checked_at: timestamp,
  }

  const { error } = await supabaseAdmin
    .from('yt_channels')
    .update(payload)
    .eq('id', channelId)

  if (error && error.message?.includes('last_rss_checked_at')) {
    delete payload.last_rss_checked_at
    await supabaseAdmin
      .from('yt_channels')
      .update(payload)
      .eq('id', channelId)
  }
}

async function updateChannelFullRssStatus(
  channelId: string,
  scannedIds: string[],
  videosImported: number,
  timestamp: string
) {
  if (!supabaseAdmin) return
  const payload: any = {
    scanned_video_ids: scannedIds,
    videos_imported: videosImported,
    last_synced_at: timestamp,
    last_rss_checked_at: timestamp,
  }

  const { error } = await supabaseAdmin
    .from('yt_channels')
    .update(payload)
    .eq('id', channelId)

  if (error && error.message?.includes('last_rss_checked_at')) {
    delete payload.last_rss_checked_at
    await supabaseAdmin
      .from('yt_channels')
      .update(payload)
      .eq('id', channelId)
  }
}
