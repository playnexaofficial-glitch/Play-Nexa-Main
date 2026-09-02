import re
with open('src/app/admin/channels/page.tsx', 'r') as f:
    c = f.read()
c = c.replace('                  </div>\n                  </a>\n                </div>\n                <div className="grid grid-cols-3', '                  </div>\n                  </a>\n                <div className="grid grid-cols-3')
with open('src/app/admin/channels/page.tsx', 'w') as f:
    f.write(c)
