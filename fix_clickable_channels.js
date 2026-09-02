const fs = require('fs');

let content = fs.readFileSync('src/app/admin/channels/page.tsx', 'utf8');

// We want to wrap the avatar and name in an anchor tag
// Current structure:
// <div className="flex items-center gap-3 mb-4">
//   {ch.channel_avatar ? ( ... ) : ( ... )}
//   <div className="flex-1 min-w-0">
//     <p className="text-white font-semibold text-sm truncate">
//       {ch.channel_name}
//     </p>
//     <div className="flex items-center gap-2 mt-1">

// We can replace `<div className="flex items-center gap-3 mb-4">` with
// `<a href={`https://youtube.com/channel/${ch.channel_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity">`
// and close `</a>` instead of `</div>`

content = content.replace(
  /<div className="flex items-center gap-3 mb-4">([\s\S]*?)<p className="text-white font-semibold text-sm truncate">\s*\{ch\.channel_name\}\s*<\/p>([\s\S]*?)<\/div>\s*<\/div>/g,
  `<a href={\`https://youtube.com/channel/\${ch.channel_id}\`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity">$1<p className="text-white font-semibold text-sm truncate">
                      {ch.channel_name}
                    </p>$2</div>
                  </a>`
);

fs.writeFileSync('src/app/admin/channels/page.tsx', content, 'utf8');
