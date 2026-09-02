import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { DISCOVERY_QUERIES } from '@/lib/discoveryQueries'

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

// ─── Duration & YouTube Helpers ───

function parseDurationToMinutes(iso8601Duration: string | undefined): number {
  if (!iso8601Duration) return 0
  const match = iso8601Duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)
  return hours * 60 + minutes + Math.round(seconds / 60)
}

async function getUploadsPlaylistId(
  channelId: string,
  ytKey: string
): Promise<string | null> {
  try {
    const url =
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails` +
      `&id=${channelId}&key=${ytKey}`
    const res = await fetch(url)
    const data = await res.json()
    const uploads =
      data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || null
    if (uploads) return uploads
  } catch {
    // ignore
  }

  if (channelId.startsWith('UC')) {
    return 'UU' + channelId.slice(2)
  }
  return null
}

// ─── Classification Helpers ───

function fallbackClassifyVideo(
  title: string,
  description: string,
  durationMinutes: number,
  channelType: string
): 'MOVIE' | 'NATOK' | 'MUSIC' | 'SKIP' {
  const text = `${title} ${description}`.toLowerCase()

  // Skip keywords — trailers, teasers, shorts, interviews, promos
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

  // Natok keywords (Drama, Telefilm, Web Series, Serial)
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

  // Movie keywords
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

  // Music keywords
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

  // Heuristics based on channel type & duration
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

  // Process in chunks of 10 to conserve tokens and maintain quality
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
      console.error('Gemini batch classification error:', err.message)
    }

    // Fallback for any items in chunk that weren't classified
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

// ── GET — Cron Worker for AI Discovery Engine ──
export async function GET(req: NextRequest) {
  try {
    // 1. Verify cron secret (matches existing pattern in auto-notify)
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
    let { data: state } = await supabaseAdmin
      .from('ai_discovery_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (!state) {
      // Create initial state row if missing
      const { data: newState } = await supabaseAdmin
        .from('ai_discovery_state')
        .upsert([{ id: 1, is_enabled: false, current_phase: 'discovery' }])
        .select()
        .single()
      state = newState
    }

    // Check if engine is enabled
    if (!state?.is_enabled) {
      return NextResponse.json({
        success: true,
        message: 'AI Discovery Engine is disabled',
      })
    }

    // 3. Daily Quota Reset Check
    const todayStr = new Date().toISOString().split('T')[0]
    let youtubeUnits = state.daily_youtube_units_used || 0
    let geminiCalls = state.daily_gemini_calls_used || 0
    let channelsFoundToday = state.channels_found_today || 0
    let videosImportedToday = state.videos_imported_today || 0

    if (state.quota_reset_date !== todayStr) {
      youtubeUnits = 0
      geminiCalls = 0
      channelsFoundToday = 0
      videosImportedToday = 0
      state.quota_reset_date = todayStr
    }

    const ytKey =
      process.env.YOUTUBE_API_KEY ||
      process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ||
      ''

    if (!ytKey) {
      await supabaseAdmin.from('ai_discovery_log').insert([
        {
          event_type: 'error',
          message: 'YouTube API key not configured in environment',
        },
      ])
      return NextResponse.json(
        { error: 'YouTube API key missing' },
        { status: 500 }
      )
    }

    // ═════════════════════════════════════════════════════════════════════
    // 4. IMPORT PHASE
    // ═════════════════════════════════════════════════════════════════════
    if (state.current_phase === 'import') {
      // Check YouTube quota safety buffer
      if (youtubeUnits + 100 > 9000) {
        await supabaseAdmin.from('ai_discovery_log').insert([
          {
            event_type: 'quota_warning',
            message: `Daily YouTube API quota nearly exhausted (${youtubeUnits}/10000 units used). Import paused for today.`,
          },
        ])

        await supabaseAdmin
          .from('ai_discovery_state')
          .update({
            daily_youtube_units_used: youtubeUnits,
            daily_gemini_calls_used: geminiCalls,
            quota_reset_date: todayStr,
            last_run_at: new Date().toISOString(),
          })
          .eq('id', 1)

        return NextResponse.json({
          success: true,
          message:
            'Daily YouTube API quota threshold reached (9000 units used)',
          quotaExhausted: true,
        })
      }

      // Step 1: Query for active 'importing' channel first, or oldest 'pending_import' channel
      let { data: channel } = await supabaseAdmin
        .from('yt_channels')
        .select('*')
        .eq('import_phase_status', 'importing')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!channel) {
        const { data: pendingChannel } = await supabaseAdmin
          .from('yt_channels')
          .select('*')
          .eq('import_phase_status', 'pending_import')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        channel = pendingChannel
      }

      // If no channel is pending/importing, the batch is complete -> Switch back to discovery
      if (!channel) {
        await supabaseAdmin.from('ai_discovery_log').insert([
          {
            event_type: 'phase_switched',
            message: 'Import batch complete, switching to discovery',
          },
        ])

        await supabaseAdmin
          .from('ai_discovery_state')
          .update({
            current_phase: 'discovery',
            daily_youtube_units_used: youtubeUnits,
            daily_gemini_calls_used: geminiCalls,
            channels_found_today: channelsFoundToday,
            videos_imported_today: videosImportedToday,
            quota_reset_date: todayStr,
            last_run_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', 1)

        return NextResponse.json({
          success: true,
          message: 'Import batch complete, switching to discovery',
          phase: 'discovery',
        })
      }

      // Step 2: Mark channel as 'importing' immediately to avoid concurrent runs picking it
      await supabaseAdmin
        .from('yt_channels')
        .update({ import_phase_status: 'importing' })
        .eq('id', channel.id)

      // Step 3: Get channel's uploads playlist ID
      const playlistId = await getUploadsPlaylistId(channel.channel_id, ytKey)
      youtubeUnits += 1

      if (!playlistId) {
        await supabaseAdmin
          .from('yt_channels')
          .update({
            import_phase_status: 'completed',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', channel.id)

        await supabaseAdmin.from('ai_discovery_log').insert([
          {
            event_type: 'error',
            message: `Could not retrieve uploads playlist for channel "${channel.channel_name}" (${channel.channel_id}). Marked as completed.`,
            channel_id: channel.channel_id,
          },
        ])

        await supabaseAdmin
          .from('ai_discovery_state')
          .update({
            daily_youtube_units_used: youtubeUnits,
            daily_gemini_calls_used: geminiCalls,
            quota_reset_date: todayStr,
            last_run_at: new Date().toISOString(),
          })
          .eq('id', 1)

        return NextResponse.json({
          success: false,
          error: 'Uploads playlist not found',
          channelId: channel.channel_id,
        })
      }

      // Step 4: Fetch up to 50 new videos using scanned_video_ids
      const scannedVideoIds: string[] = Array.isArray(channel.scanned_video_ids)
        ? channel.scanned_video_ids
        : []

      let pageToken = ''
      let newVideosToProcess: any[] = []
      let hasNextPageToken = false

      do {
        if (youtubeUnits + 1 > 9000) break

        const plUrl =
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet` +
          `&playlistId=${playlistId}&maxResults=50&key=${ytKey}` +
          (pageToken ? `&pageToken=${pageToken}` : '')

        const plRes = await fetch(plUrl)
        const plData = await plRes.json()
        youtubeUnits += 1

        if (plData.error) {
          await supabaseAdmin.from('ai_discovery_log').insert([
            {
              event_type: 'error',
              message: `Playlist fetch error for "${channel.channel_name}": ${plData.error.message || 'Unknown error'}`,
              channel_id: channel.channel_id,
            },
          ])
          break
        }

        const items = plData.items || []
        const pageVideos: any[] = []
        for (const item of items) {
          const snippet = item.snippet
          const vId = snippet?.resourceId?.videoId
          if (
            !vId ||
            snippet.title === 'Private video' ||
            snippet.title === 'Deleted video'
          )
            continue

          pageVideos.push({
            videoId: vId,
            title: snippet.title || '',
            thumbnail:
              snippet.thumbnails?.medium?.url ||
              snippet.thumbnails?.high?.url ||
              snippet.thumbnails?.default?.url ||
              `https://i.ytimg.com/vi/${vId}/mqdefault.jpg`,
            publishedAt: snippet.publishedAt || new Date().toISOString(),
            description: (snippet.description || '').slice(0, 300),
            channelId: snippet.channelId || channel.channel_id,
            channelName: snippet.channelTitle || channel.channel_name,
            durationRaw: '',
            durationMinutes: 0,
          })
        }

        const unscanned = pageVideos.filter(
          (v) => !scannedVideoIds.includes(v.videoId)
        )

        if (unscanned.length > 0) {
          newVideosToProcess = unscanned.slice(0, 50)
          hasNextPageToken = !!plData.nextPageToken
          break
        }

        pageToken = plData.nextPageToken || ''
        hasNextPageToken = !!pageToken
      } while (pageToken)

      // If no new videos found on the channel
      if (newVideosToProcess.length === 0) {
        await supabaseAdmin
          .from('yt_channels')
          .update({
            import_phase_status: 'completed',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', channel.id)

        await supabaseAdmin.from('ai_discovery_log').insert([
          {
            event_type: 'channel_completed',
            message: `Channel "${channel.channel_name}" import completed (all videos scanned).`,
            channel_id: channel.channel_id,
          },
        ])

        await supabaseAdmin
          .from('ai_discovery_state')
          .update({
            daily_youtube_units_used: youtubeUnits,
            daily_gemini_calls_used: geminiCalls,
            quota_reset_date: todayStr,
            last_run_at: new Date().toISOString(),
          })
          .eq('id', 1)

        return NextResponse.json({
          success: true,
          message: `Channel "${channel.channel_name}" import completed`,
          channelId: channel.channel_id,
        })
      }

      // Step 5: Fetch duration via videos.list in a single batched call
      if (youtubeUnits + 1 <= 9000 && newVideosToProcess.length > 0) {
        try {
          const videoIds = newVideosToProcess.map((v) => v.videoId).join(',')
          const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${ytKey}`
          const vRes = await fetch(vUrl)
          const vData = await vRes.json()
          youtubeUnits += 1

          if (vData.items && Array.isArray(vData.items)) {
            const detailsMap = new Map<string, any>()
            for (const item of vData.items) {
              detailsMap.set(item.id, item)
            }

            for (const v of newVideosToProcess) {
              const detail = detailsMap.get(v.videoId)
              if (detail) {
                v.durationRaw = detail.contentDetails?.duration || ''
                v.durationMinutes = parseDurationToMinutes(v.durationRaw)
                if (detail.snippet?.title) v.title = detail.snippet.title
                if (detail.snippet?.description) {
                  v.description = detail.snippet.description.slice(0, 300)
                }
              }
            }
          }
        } catch (detailErr: any) {
          console.error('Error fetching video durations:', detailErr.message)
        }
      }

      // Step 6 & 7: Gemini Classification
      const { key: geminiKey, id: geminiKeyId } = await getActiveGeminiKey()
      const classifications = await classifyVideoBatchWithGemini(
        newVideosToProcess,
        channel.channel_type || 'movies',
        geminiKey,
        geminiKeyId
      )

      if (geminiKey) {
        geminiCalls += Math.ceil(newVideosToProcess.length / 10)
      }

      // Step 8: Database Insertion & Duplicate Check
      let moviesAdded = 0
      let natokAdded = 0
      let musicAdded = 0
      let skippedCount = 0
      let dupCount = 0

      const vIds = newVideosToProcess.map((v) => v.videoId)
      const [{ data: existingMovies }, { data: existingMusic }] =
        await Promise.all([
          supabaseAdmin
            .from('movies')
            .select('youtube_id')
            .in('youtube_id', vIds),
          supabaseAdmin
            .from('music_tracks')
            .select('youtube_id')
            .in('youtube_id', vIds),
        ])

      const existingSet = new Set([
        ...(existingMovies || []).map((m: any) => m.youtube_id),
        ...(existingMusic || []).map((m: any) => m.youtube_id),
      ])

      const updatedScannedIds = [...scannedVideoIds]

      for (const video of newVideosToProcess) {
        if (!updatedScannedIds.includes(video.videoId)) {
          updatedScannedIds.push(video.videoId)
        }

        const classification = classifications.get(video.videoId) || 'SKIP'

        if (classification === 'SKIP') {
          skippedCount++
          continue
        }

        if (existingSet.has(video.videoId)) {
          dupCount++
          continue
        }

        if (classification === 'MOVIE' || classification === 'NATOK') {
          const contentType = classification === 'NATOK' ? 'natok' : 'movie'
          const { error } = await supabaseAdmin.from('movies').insert([
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

          if (!error) {
            if (contentType === 'natok') natokAdded++
            else moviesAdded++
            videosImportedToday++
          } else if (error.code === '23505') {
            dupCount++
          }
        } else if (classification === 'MUSIC') {
          const { error } = await supabaseAdmin.from('music_tracks').insert([
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

          if (!error) {
            musicAdded++
            videosImportedToday++
          } else if (error.code === '23505') {
            dupCount++
          }
        }
      }

      const totalImportedThisBatch = moviesAdded + natokAdded + musicAdded
      const nextChannelStatus = hasNextPageToken ? 'importing' : 'completed'

      // Update channel in yt_channels
      await supabaseAdmin
        .from('yt_channels')
        .update({
          scanned_video_ids: updatedScannedIds,
          videos_imported:
            (channel.videos_imported || 0) + totalImportedThisBatch,
          import_phase_status: nextChannelStatus,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', channel.id)

      // Update channel_display if any media was imported
      if (totalImportedThisBatch > 0) {
        await supabaseAdmin.from('channel_display').upsert(
          [
            {
              channel_id: channel.channel_id,
              display_name: channel.channel_name,
              logo_url: channel.channel_avatar || '',
              badge_color: natokAdded > moviesAdded ? '#06B6D4' : '#7C3AED',
              border_color: natokAdded > moviesAdded ? '#06B6D4' : '#7C3AED',
              is_visible: true,
              sort_order: 0,
            },
          ],
          { onConflict: 'channel_id' }
        )
      }

      // Step 9: Log summary of this batch
      await supabaseAdmin.from('ai_discovery_log').insert([
        {
          event_type: 'videos_imported',
          message: `Imported from "${channel.channel_name}": ${moviesAdded} movies, ${natokAdded} natok, ${musicAdded} music (${skippedCount} skipped, ${dupCount} duplicates).`,
          channel_id: channel.channel_id,
        },
      ])

      // Step 10: Log completion if playlist has no further pages
      if (!hasNextPageToken) {
        await supabaseAdmin.from('ai_discovery_log').insert([
          {
            event_type: 'channel_completed',
            message: `Channel "${channel.channel_name}" import completed (${updatedScannedIds.length} total videos scanned).`,
            channel_id: channel.channel_id,
          },
        ])
      }

      // Save updated state
      await supabaseAdmin
        .from('ai_discovery_state')
        .update({
          daily_youtube_units_used: youtubeUnits,
          daily_gemini_calls_used: geminiCalls,
          channels_found_today: channelsFoundToday,
          videos_imported_today: videosImportedToday,
          quota_reset_date: todayStr,
          last_run_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)

      return NextResponse.json({
        success: true,
        phase: 'import',
        channel: channel.channel_name,
        channelId: channel.channel_id,
        videosProcessed: newVideosToProcess.length,
        moviesAdded,
        natokAdded,
        musicAdded,
        skippedCount,
        dupCount,
        hasNextPageToken,
        channelStatus: nextChannelStatus,
        videosImportedToday,
        youtubeUnitsUsedToday: youtubeUnits,
        geminiCallsUsedToday: geminiCalls,
      })
    }

    // ═════════════════════════════════════════════════════════════════════
    // 5. DISCOVERY PHASE LOGIC
    // ═════════════════════════════════════════════════════════════════════
    if (youtubeUnits + 100 > 9000) {
      await supabaseAdmin.from('ai_discovery_log').insert([
        {
          event_type: 'quota_warning',
          message: `Daily YouTube API quota nearly exhausted (${youtubeUnits}/10000 units used). Discovery paused for today.`,
        },
      ])

      await supabaseAdmin
        .from('ai_discovery_state')
        .update({
          daily_youtube_units_used: youtubeUnits,
          daily_gemini_calls_used: geminiCalls,
          quota_reset_date: todayStr,
          last_run_at: new Date().toISOString(),
        })
        .eq('id', 1)

      return NextResponse.json({
        success: true,
        message: 'Daily YouTube API quota threshold reached (9000 units used)',
        quotaExhausted: true,
      })
    }

    // Pick next query
    const queryIndex = state.current_query_index || 0
    const currentQuery =
      DISCOVERY_QUERIES[queryIndex % DISCOVERY_QUERIES.length]
    const nextQueryIndex = (queryIndex + 1) % DISCOVERY_QUERIES.length

    let searchItems: any[] = []
    try {
      const searchUrl =
        `https://www.googleapis.com/youtube/v3/search?part=snippet` +
        `&type=channel&maxResults=10` +
        `&q=${encodeURIComponent(currentQuery)}` +
        `&key=${ytKey}`

      const res = await fetch(searchUrl)
      const data = await res.json()
      youtubeUnits += 100

      if (data.error) {
        await supabaseAdmin.from('ai_discovery_log').insert([
          {
            event_type: 'error',
            message: `YouTube API search error: ${data.error.message || 'Unknown error'}`,
          },
        ])
      } else {
        searchItems = data.items || []
      }
    } catch (e: any) {
      await supabaseAdmin.from('ai_discovery_log').insert([
        {
          event_type: 'error',
          message: `YouTube search fetch failed: ${e.message}`,
        },
      ])
    }

    let channelsAddedThisRun = 0

    // Process returned channels
    for (const item of searchItems) {
      const channelId = item.id?.channelId || item.snippet?.channelId
      if (!channelId) continue

      try {
        // Check if channel already exists in yt_channels (enforcing no duplicate rule)
        const { data: existingChannel } = await supabaseAdmin
          .from('yt_channels')
          .select('id, channel_id')
          .eq('channel_id', channelId)
          .maybeSingle()

        if (existingChannel) {
          // Channel already in system, skip
          continue
        }

        // Fetch channel details & uploads playlist
        let description = item.snippet?.description || ''
        let channelTitle = item.snippet?.title || ''
        let avatarUrl =
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.default?.url ||
          ''
        let recentVideoTitles: string[] = []
        let uploadsPlaylistId: string | null = null

        try {
          const detailUrl =
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails` +
            `&id=${channelId}&key=${ytKey}`
          const detailRes = await fetch(detailUrl)
          const detailData = await detailRes.json()
          youtubeUnits += 1

          const channelItem = detailData.items?.[0]
          if (channelItem) {
            description = channelItem.snippet?.description || description
            channelTitle = channelItem.snippet?.title || channelTitle
            avatarUrl =
              channelItem.snippet?.thumbnails?.high?.url ||
              channelItem.snippet?.thumbnails?.default?.url ||
              avatarUrl
            uploadsPlaylistId =
              channelItem.contentDetails?.relatedPlaylists?.uploads || null
          }
        } catch (detailErr) {
          // Ignore detail fetch error fallback
        }

        // Fetch 5 recent video titles from upload playlist if available
        if (uploadsPlaylistId) {
          try {
            const playlistUrl =
              `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet` +
              `&playlistId=${uploadsPlaylistId}&maxResults=5&key=${ytKey}`
            const playlistRes = await fetch(playlistUrl)
            const playlistData = await playlistRes.json()
            youtubeUnits += 1

            const items = playlistData.items || []
            recentVideoTitles = items
              .map((i: any) => i.snippet?.title)
              .filter(Boolean)
          } catch (plErr) {
            // Ignore playlist error fallback
          }
        }

        // Gemini Verification Step
        const { key: geminiKey, id: geminiKeyId } = await getActiveGeminiKey()
        let classification = 'NONE'

        if (geminiKey) {
          try {
            const genAI = new GoogleGenerativeAI(geminiKey)
            const model = genAI.getGenerativeModel({
              model: 'gemini-1.5-flash',
            })

            const prompt =
              `Analyze this YouTube channel and determine if it primarily posts full movies, natok/drama series, or music content.\n` +
              `Channel Title: "${channelTitle}"\n` +
              `Channel Description: "${description.slice(0, 300)}"\n` +
              `Recent Videos: ${recentVideoTitles.map((t) => `"${t}"`).join(', ')}\n\n` +
              `Does this channel primarily post movies, natok/drama series, or music content? Reply with one word: MOVIE, NATOK, MUSIC, MIXED, or NONE.`

            const result = await model.generateContent(prompt)
            const rawText = result.response.text().trim().toUpperCase()
            geminiCalls += 1
            await incrementGeminiKeyUsage(geminiKeyId)

            if (rawText.includes('MOVIE')) classification = 'MOVIE'
            else if (rawText.includes('NATOK')) classification = 'NATOK'
            else if (rawText.includes('MUSIC')) classification = 'MUSIC'
            else if (rawText.includes('MIXED')) classification = 'MIXED'
            else classification = 'NONE'
          } catch (geminiErr: any) {
            console.error('Gemini verification error:', geminiErr.message)
            // Fallback keyword classification if Gemini fails
            const fullText =
              `${channelTitle} ${description} ${recentVideoTitles.join(' ')}`.toLowerCase()
            if (
              fullText.includes('natok') ||
              fullText.includes('drama') ||
              fullText.includes('telefilm')
            ) {
              classification = 'NATOK'
            } else if (
              fullText.includes('movie') ||
              fullText.includes('film') ||
              fullText.includes('cinema')
            ) {
              classification = 'MOVIE'
            } else if (
              fullText.includes('music') ||
              fullText.includes('song') ||
              fullText.includes('audio') ||
              fullText.includes('records')
            ) {
              classification = 'MUSIC'
            } else {
              classification = 'NONE'
            }
          }
        } else {
          // Keyword fallback if no Gemini key available
          const fullText =
            `${channelTitle} ${description} ${recentVideoTitles.join(' ')}`.toLowerCase()
          if (
            fullText.includes('natok') ||
            fullText.includes('drama') ||
            fullText.includes('telefilm')
          ) {
            classification = 'NATOK'
          } else if (
            fullText.includes('movie') ||
            fullText.includes('film') ||
            fullText.includes('cinema')
          ) {
            classification = 'MOVIE'
          } else if (
            fullText.includes('music') ||
            fullText.includes('song') ||
            fullText.includes('audio') ||
            fullText.includes('records')
          ) {
            classification = 'MUSIC'
          } else {
            classification = 'NONE'
          }
        }

        // If Gemini / classification is NONE, skip channel
        if (classification === 'NONE') {
          continue
        }

        // Map classification to channel_type
        // Note: NATOK is mapped to 'movies' since natok lives in the movies table
        let mappedChannelType: 'movies' | 'music' | 'mixed' = 'movies'
        if (classification === 'MUSIC') mappedChannelType = 'music'
        else if (classification === 'MIXED') mappedChannelType = 'mixed'

        // Insert verified channel into yt_channels
        const { error: insertErr } = await supabaseAdmin
          .from('yt_channels')
          .insert([
            {
              channel_id: channelId,
              channel_name: channelTitle,
              channel_avatar: avatarUrl,
              channel_type: mappedChannelType,
              is_active: true,
              scan_status: 'idle',
              discovered_by_ai: true,
              discovery_query: currentQuery,
              import_phase_status: 'pending_import',
            },
          ])

        if (!insertErr) {
          channelsAddedThisRun += 1
          channelsFoundToday += 1

          // Log channel discovery
          await supabaseAdmin.from('ai_discovery_log').insert([
            {
              event_type: 'channel_discovered',
              message: `Discovered channel "${channelTitle}" (${mappedChannelType}) via query "${currentQuery}"`,
              channel_id: channelId,
            },
          ])
        }
      } catch (channelErr: any) {
        console.error(
          `Error processing channel ${channelId}:`,
          channelErr.message
        )
      }
    }

    // Check count of pending_import channels for phase switch (threshold = 30)
    let currentPhase = 'discovery'
    const { count: pendingCount } = await supabaseAdmin
      .from('yt_channels')
      .select('*', { count: 'exact', head: true })
      .eq('import_phase_status', 'pending_import')

    if ((pendingCount || 0) >= 30) {
      currentPhase = 'import'
      await supabaseAdmin.from('ai_discovery_log').insert([
        {
          event_type: 'phase_switched',
          message: `Pending import channel count reached ${pendingCount}. Switching engine phase to "import".`,
        },
      ])
    }

    // Save final state
    await supabaseAdmin
      .from('ai_discovery_state')
      .update({
        daily_youtube_units_used: youtubeUnits,
        daily_gemini_calls_used: geminiCalls,
        quota_reset_date: todayStr,
        last_run_at: new Date().toISOString(),
        current_query_index: nextQueryIndex,
        channels_found_today: channelsFoundToday,
        current_phase: currentPhase,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    return NextResponse.json({
      success: true,
      queryUsed: currentQuery,
      channelsDiscoveredThisRun: channelsAddedThisRun,
      channelsFoundToday,
      pendingImportCount: pendingCount || 0,
      currentPhase,
      youtubeUnitsUsedToday: youtubeUnits,
      geminiCallsUsedToday: geminiCalls,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
