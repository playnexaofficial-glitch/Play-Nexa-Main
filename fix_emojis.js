const fs = require('fs');
const path = require('path');

function walkSync(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    let filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walkSync(filepath, callback);
    } else if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
      callback(filepath);
    }
  });
}

walkSync('src/app/admin', file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const replacements = [
    { from: "showToast('✅ ' + ", to: "showToast(" },
    { from: "showToast('❌ ' + ", to: "showToast('Error: ' + " },
    { from: "showToast(nextHidden ? '👁️ Hidden from app' : '✅ Visible in app')", to: "showToast(nextHidden ? 'Hidden from app' : 'Visible in app')" },
    { from: "showToast('🗑️ Movie deleted')", to: "showToast('Movie deleted')" },
    { from: "showToast('🗑️ Track deleted')", to: "showToast('Track deleted')" },
    { from: "showToast('🚀 Full import started!')", to: "showToast('Full import started!')" },
    { from: "showToast('🗑️ Key removed')", to: "showToast('Key removed')" },
    { from: "showToast('📋 Copied to clipboard')", to: "showToast('Copied to clipboard')" },
    { from: "showToast('📋 Copied key to clipboard!')", to: "showToast('Copied key to clipboard!')" },
    { from: "showToast(`✅ \"${data.title}\" added!`)", to: "showToast(`\"${data.title}\" added!`)" },
    { from: "showToast(`✅ Imported ${success} items`)", to: "showToast(`Imported ${success} items`)" },
    { from: "showToast(`✅ Saved ${key}`)", to: "showToast(`Saved ${key}`)" },
    { from: "showToast(`✅ ${feature.label} updated!`)", to: "showToast(`${feature.label} updated!`)" },
    { from: "showToast(`✅ Status updated to ${status}`)", to: "showToast(`Status updated to ${status}`)" },
    { from: "showToast(`✅ ${action} succeeded for ${provider}`, 'success')", to: "showToast(`${action} succeeded for ${provider}`, 'success')" },
    { from: "showToast(`❌ ${action} failed: ${err?.message}`, 'error')", to: "showToast(`Error: ${action} failed: ${err?.message}`, 'error')" },
    { from: "showToast('✅ All content cleared!')", to: "showToast('All content cleared!')" },
    { from: "showToast('❌ Error: ' + ", to: "showToast('Error: ' + " },
    { from: "showToast('❌ Network error while clearing content')", to: "showToast('Error: Network error while clearing content')" },
    { from: "showToast('❌ Network error')", to: "showToast('Error: Network error')" },
    { from: "showToast('✅ Channel saved! Scanning...')", to: "showToast('Channel saved! Scanning...')" },
    { from: "showToast('✅ Channel deleted')", to: "showToast('Channel deleted')" },
    { from: "showToast('✅ All Branding Saved!')", to: "showToast('All Branding Saved!')" },
    { from: "showToast('❌ Failed to save branding')", to: "showToast('Error: Failed to save branding')" },
    { from: "showToast('✅ Key updated!')", to: "showToast('Key updated!')" },
    { from: "showToast('❌ Could not reveal key')", to: "showToast('Error: Could not reveal key')" },
    { from: "showToast('❌ Fill in key name and value')", to: "showToast('Error: Fill in key name and value')" },
    { from: "showToast('✅ Added to vault!')", to: "showToast('Added to vault!')" },
    { from: "showToast('❌ Error deleting')", to: "showToast('Error: Error deleting')" }
  ];

  replacements.forEach(rep => {
    while (content.includes(rep.from)) {
      content = content.replace(rep.from, rep.to);
      changed = true;
    }
  });

  if (file.includes('channels/page.tsx')) {
    if (content.includes("console.error('FID poll error', err)")) {
       content = content.replace("console.error('FID poll error', err)", "");
       changed = true;
    }
  }
  
  if (file.includes('audit/page.tsx')) {
    const rx = /console\.error\('Failed to load audit( |\\n\s*)logs:', err\)/;
    if (rx.test(content)) {
       content = content.replace(rx, "");
       changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
