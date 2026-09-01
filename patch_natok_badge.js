const fs = require('fs');
let code = fs.readFileSync('src/app/api/admin/auto-scan/route.ts', 'utf8');

const regex = /if \(!error\) \{\n\s*moviesAdded\+\+\n\s*\} else if \(error\.code === '23505'\) \{/;
const newCode = `if (!error) {
          moviesAdded++
          await supabaseAdmin.from('channel_display').upsert(
            [
              {
                channel_id: channel.channel_id,
                display_name: channel.channel_name,
                logo_url: channel.channel_avatar || '',
                badge_color: '#06B6D4',
                border_color: '#06B6D4',
                is_visible: true,
                sort_order: 0,
              },
            ],
            {
              onConflict: 'channel_id',
            }
          )
        } else if (error.code === '23505') {`;
code = code.replace(regex, newCode);
fs.writeFileSync('src/app/api/admin/auto-scan/route.ts', code);
