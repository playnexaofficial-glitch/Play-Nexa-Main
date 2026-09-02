import re
with open('src/app/admin/channels/page.tsx', 'r') as f:
    c = f.read()

# find:
#                   </div>
#                   </a>
#                 </div>
#                 <div className="grid grid-cols-3 gap-2 mb-3">
c = re.sub(
    r'(\s*</div>\s*</a>\s*)</div>(\s*<div className="grid grid-cols-3 gap-2 mb-3">)',
    r'\1\2',
    c
)

with open('src/app/admin/channels/page.tsx', 'w') as f:
    f.write(c)
