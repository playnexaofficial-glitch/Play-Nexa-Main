import re
import os
import glob

# All files in admin
files = glob.glob('src/app/admin/**/*.tsx', recursive=True)

# Regex to match emojis
# Ranges for emojis
emoji_pattern = re.compile(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\u2600-\u26FF\u2700-\u27BF]')

for file in files:
    with open(file, 'r', encoding='utf8') as f:
        content = f.read()

    # some custom replacements
    custom = [
        ("showToast('✅ Key activated for Gemini AI!')", "showToast('Key activated for Gemini AI!')"),
        ("showToast('❌ Please fill in both key name and API key')", "showToast('Error: Please fill in both key name and API key')"),
        ("showToast('✅ Gemini API Key added!')", "showToast('Gemini API Key added!')"),
        ("showToast('❌ Error deleting key')", "showToast('Error: Error deleting key')"),
        ("setFixPrompt('❌ Failed to get AI prompt')", "setFixPrompt('Error: Failed to get AI prompt')"),
        ("`✅ Import done! 🎬 ${data.moviesAdded || 0} movies + 🎵 ${data.musicAdded || 0} music`", "`Import done! ${data.moviesAdded || 0} movies + ${data.musicAdded || 0} music`"),
        ("✅ Import Complete!", "Import Complete!"),
        ("✅ Already imported", "Already imported"),
        ("{v.result === 'PASS' ? '✓' : '✕'}", "{v.result === 'PASS' ? 'Pass' : 'Fail'}"),
        ("✕", "X"), # Cross
        ("✓", "V"), # Check
        ("✨", ""), # Sparkles
        ("🚀", ""),
        ("🤖", ""),
        ("⚡", ""),
        ("📊", ""),
        ("💡", ""),
        ("🎬", ""),
        ("🔍", ""),
        ("🏷️", ""),
        ("💬", ""),
        ("🎵", ""),
        ("📋", ""),
        ("❌", ""),
        ("✅", ""),
        ("👥", ""),
        ("📥", ""),
        ("👁️", ""),
        ("🚫", ""),
        ("🗑️", ""),
        ("🔥", ""),
        ("🔑", ""),
        ("🎮", ""),
        ("📱", ""),
        ("🐛", ""),
        ("⚙️", ""),
    ]
    
    for f, t in custom:
        content = content.replace(f, t)
        
    # fallback strip
    content = emoji_pattern.sub('', content)

    with open(file, 'w', encoding='utf8') as f:
        f.write(content)
