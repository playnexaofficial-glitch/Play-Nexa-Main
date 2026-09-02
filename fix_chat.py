import re

with open('src/app/admin/chat/page.tsx', 'r', encoding='utf8') as f:
    text = f.read()

# Replace QUICK_ACTIONS
text = text.replace("'📊 SQL Helper'", "'SQL Helper'")
text = text.replace("'🐛 Bug Fix'", "'Bug Fix'")
text = text.replace("'📱 App Info'", "'App Info'")
text = text.replace("'🔧 Code'", "'Code'")

# Replace initial message
old_msg_pattern = r'content:\s*`আমি Play Nexa AI Assistant! 🤖.*?কী সাহায্য লাগবে\?`'
new_msg = 'content: `আমি Play Nexa AI Assistant।\\n\\nতোমার app সম্পর্কে সব জানি।\\n\\nSQL Helper, Bug Fix, App Info, Code — যেকোনো বিষয়ে সাহায্য করবো।`'
text = re.sub(old_msg_pattern, new_msg, text, flags=re.DOTALL)

# Replace 🤖 AI Assistant header
text = text.replace('🤖 AI Assistant', 'AI Assistant')

# Check other emoji
text = text.replace('❌ Error.', 'Error.')

with open('src/app/admin/chat/page.tsx', 'w', encoding='utf8') as f:
    f.write(text)

