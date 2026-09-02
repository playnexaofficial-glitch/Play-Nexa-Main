const fs = require('fs');
let code = fs.readFileSync('src/app/api/admin/quick-add/route.ts', 'utf8');

// Fix the AI classification part
const classifyRegex = /const t = res\.response\.text\(\)\.toLowerCase\(\)\.trim\(\)[\s\S]*?: 'skip'/;
const newClassify = `const t = res.response.text().toLowerCase().trim()
          aiSuggestion = t.includes('music')
            ? 'music'
            : t.includes('natok')
            ? 'natok'
            : t.includes('movie')
            ? 'movie'
            : 'skip'`;
code = code.replace(classifyRegex, newClassify);

// Fix movie insert type
// Find the exact insert for movie
const movieInsertBlockRegex = /if \(finalCategory === 'movie'\) \{[\s\S]*?published_at: new Date\(\)\.toISOString\(\),\s*\},/;
// I can just replace `published_at: new Date().toISOString(),` with `published_at: new Date().toISOString(), content_type: 'movie',` in the movie block.
// Wait, the block currently has it, wait no it doesn't.
let parts = code.split("if (finalCategory === 'movie') {");
if(parts.length > 1) {
  parts[1] = parts[1].replace("published_at: new Date().toISOString(),", "published_at: new Date().toISOString(),\n            content_type: 'movie',");
}
code = parts.join("if (finalCategory === 'movie') {");

fs.writeFileSync('src/app/api/admin/quick-add/route.ts', code);
