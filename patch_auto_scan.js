const fs = require('fs');
let code = fs.readFileSync('src/app/api/admin/auto-scan/route.ts', 'utf8');

// Replace fallbackClassify
const fallbackRegex = /function fallbackClassify\([\s\S]*?return \{ type: 'skip', confidence: 0\.5 \}\n\}/;
const newFallback = `function fallbackClassify(
  title: string,
  description: string,
  channelName: string
): { type: string; confidence: number } {
  const text =
    \`\${title} \${description} \${channelName}\`
    .toLowerCase()

  // Skip words — these are NOT content
  const skipWords = [
    'trailer', 'teaser', '#shorts', 'shorts',
    'making of', 'interview', 'promo', 'preview',
    'behind the scenes', 'official trailer',
    'clip', 'sneak peek', 'reaction', 'review',
  ]
  if (skipWords.some(w => text.includes(w)))
    return { type: 'skip', confidence: 0.9 }

  // Music detection (highest priority)
  const musicWords = [
    'official music video', 'music video',
    'audio', 'lyric', 'song', 'lyrics',
    'feat.', 'ft.', 'prod.', 'album', 'single',
    'official audio', 'full album',
  ]
  if (musicWords.some(w => text.includes(w)))
    return { type: 'music', confidence: 0.9 }

  // Natok/Drama detection (before movie)
  const natokWords = [
    'নাটক', 'natok', 'telefilm', 'eid natok',
    'eid special', 'web series', 'drama serial',
    'episode', ' ep ', 'ep.', 'part ',
    'পর্ব', 'full episode', 'bangla drama',
    'serial', 'mini series', 'short film',
    'telefilm', 'eid telefilm',
  ]
  if (natokWords.some(w => text.includes(w)))
    return { type: 'natok', confidence: 0.88 }

  // Movie detection
  const movieWords = [
    'full movie', 'official movie', 'bengali movie',
    'bangla movie', 'hindi movie', 'bollywood',
    'hollywood', 'south movie', 'action movie',
    'romantic movie', 'comedy movie', 'film',
    'চলচ্চিত্র', 'সিনেমা', 'মুভি',
  ]
  if (movieWords.some(w => text.includes(w)))
    return { type: 'movie', confidence: 0.85 }

  return { type: 'skip', confidence: 0.4 }
}`;

code = code.replace(fallbackRegex, newFallback);

// Replace Gemini Prompt
const promptRegex = /\`Classify this YouTube video\.[\s\S]*?clip\`/
const newPrompt = `\`Classify this YouTube video:
Title: "\${title}"
Channel: "\${channelName}"
Description: "\${description?.slice(0,200) || ''}"

Rules:
- movie = full Bangladeshi/Hindi/English film/cinema
- natok = Bangladeshi drama/natok/telefilm/web series/episode
- music = song/music video/audio/lyric video
- skip = trailer/teaser/shorts/interview/clip/promo

Reply ONLY with valid JSON, nothing else:
{"type":"movie","confidence":0.9}
OR {"type":"natok","confidence":0.9}
OR {"type":"music","confidence":0.9}
OR {"type":"skip","confidence":0.9}\``;
code = code.replace(promptRegex, newPrompt);

// Update insert logic
const insertLogicRegex = /const insertAsMovie =[\s\S]*?\(channelType === 'music' \|\| channelType === 'mixed'\)/;
const newInsertLogic = `const insertAsMovie =
    (result.type === 'movie' &&
     result.confidence >= 0.6) ||
    (channelType === 'movies' &&
     result.type !== 'music' &&
     result.type !== 'natok' &&
     result.confidence >= 0.5)

  const insertAsNatok =
    result.type === 'natok' &&
    result.confidence >= 0.6

  const insertAsMusic =
    (result.type === 'music' &&
     result.confidence >= 0.6) ||
    (channelType === 'music' &&
     result.type !== 'movie' &&
     result.type !== 'natok')`;
code = code.replace(insertLogicRegex, newInsertLogic);

const movieInsertBlockRegex = /if \(insertAsMovie\) \{[\s\S]*?\} else if \(insertAsMusic\)/;
// Wait, I can replace just `} else if (insertAsMusic)`
const elseIfInsertMusic = `} else if (insertAsNatok) {
        const { error } = await supabaseAdmin
          .from('movies')
          .insert([{
            youtube_id: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
            channel_name: channel.channel_name,
            channel_id: channel.channel_id,
            description: video.description || '',
            published_at: video.publishedAt,
            view_count: video.viewCount || 0,
            source_channel_id: channelId,
            is_hidden: false,
            content_type: 'natok',
          }])
        if (!error) {
          moviesAdded++
        } else if (error.code === '23505') {
          console.log('[SCAN] Duplicate skipped:',
            video.videoId)
        }
      } else if (insertAsMusic)`;
code = code.replace("} else if (insertAsMusic)", elseIfInsertMusic);

fs.writeFileSync('src/app/api/admin/auto-scan/route.ts', code);
