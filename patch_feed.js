const fs = require('fs');
let code = fs.readFileSync('src/app/api/movies/feed/route.ts', 'utf8');

// Add contentType param
code = code.replace(
  "const channel = req.nextUrl.searchParams.get('channel') || 'all'",
  "const channel = req.nextUrl.searchParams.get('channel') || 'all'\n  const contentType = req.nextUrl.searchParams.get('type') || 'all'"
);

function applyQuery(name, original) {
  let modified = `let ${name}Query = ${original.replace(`const { data: ${name} } = await `, '')}`
  modified = modified + `\n    if (contentType !== 'all') {`
  modified = modified + `\n      ${name}Query = ${name}Query.eq('content_type', contentType)`
  modified = modified + `\n    }`
  modified = modified + `\n    const { data: ${name} } = await ${name}Query`
  return modified;
}

// featured
const featuredRegex = /const \{ data: featured \} = await supabase[\s\S]*?\.limit\(10\)/;
code = code.replace(featuredRegex, (match) => applyQuery('featured', match));

// trending
const trendingRegex = /const \{ data: trending \} = await supabase[\s\S]*?\.limit\(20\)/;
code = code.replace(trendingRegex, (match) => applyQuery('trending', match));

// newReleases
const newReleasesRegex = /const \{ data: newReleases \} = await supabase[\s\S]*?\.limit\(20\)/;
code = code.replace(newReleasesRegex, (match) => applyQuery('newReleases', match));

// channelSections
const chMoviesRegex = /const \{ data: chMovies \} = await supabase[\s\S]*?\.limit\(10\)/;
code = code.replace(chMoviesRegex, (match) => applyQuery('chMovies', match));

fs.writeFileSync('src/app/api/movies/feed/route.ts', code);
