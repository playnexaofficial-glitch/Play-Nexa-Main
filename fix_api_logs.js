const fs = require('fs');
const path = require('path');

function walkSync(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    let filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walkSync(filepath, callback);
    } else if (filepath.endsWith('.ts') || filepath.endsWith('.tsx')) {
      callback(filepath);
    }
  });
}

walkSync('src/app/api/admin', file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/console\.(log|warn|error|info)\(.*?\)\;?/gs, "");
  // Actually, standard regex might span multiple lines if we use .*?, but sometimes it breaks.
  // We can just remove lines containing console.log, console.error, console.warn, console.info
  // Wait, if it spans lines, `runFullImport(channelDbId, channel).catch(console.error)` is single line.
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
  }
});
