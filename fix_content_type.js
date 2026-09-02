const fs = require('fs');
let code = fs.readFileSync('src/app/api/admin/auto-scan/route.ts', 'utf8');

code = code.replace(
  `is_hidden: false,
            content_type: "movie",
            content_type: 'natok',`,
  `is_hidden: false,
            content_type: 'natok',`
);

fs.writeFileSync('src/app/api/admin/auto-scan/route.ts', code);
