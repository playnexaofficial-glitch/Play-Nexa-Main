const fs = require('fs');
let code = fs.readFileSync('src/app/api/admin/quick-add/route.ts', 'utf8');

// Replace the text checking
const classifyRegex = /const t = res\.response\.text\(\)\.toLowerCase\(\)\n\s*aiSuggestion = t\.includes\('music'\) \? 'music' : t\.includes\('movie'\) \? 'movie' : 'skip'/;
const newClassify = `const t = res.response.text().toLowerCase()
        aiSuggestion =
          t.includes('music') ? 'music'
          : t.includes('natok') ? 'natok'
          : t.includes('movie') ? 'movie'
          : 'skip'`;
code = code.replace(classifyRegex, newClassify);

// Replace prompt
code = code.replace("Reply ONLY: movie OR music OR skip", "Reply ONLY one word: movie OR natok OR music OR skip");

// Add content_type to movie
// Note: using regex to match the insert block for movie
const movieInsertRegex = /if \(finalCategory === 'movie'\) \{[\s\S]*?is_hidden: false,\n\s*description: '',\n\s*published_at: new Date\(\)\.toISOString\(\),\n\s*\}\]/;
// wait, let's just use string replace for the end of the object
code = code.replace(
  "published_at: new Date().toISOString(),\n        }])",
  "published_at: new Date().toISOString(),\n        content_type: 'movie',\n        }])"
);

// Add natok case
const natokCase = `if (finalCategory === 'natok') {
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
        description: '',
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
          ? \`https://unavatar.io/youtube/\${channelId}\`
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

  if (finalCategory === 'music') {`;

code = code.replace("if (finalCategory === 'music') {", natokCase);

fs.writeFileSync('src/app/api/admin/quick-add/route.ts', code);
