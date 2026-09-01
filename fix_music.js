const fs = require('fs');
let code = fs.readFileSync('src/app/api/admin/auto-scan/route.ts', 'utf8');

// I will split by `insertAsMusic`, then fix only in the second part.
let parts = code.split("if (insertAsMusic) {");
if (parts.length > 1) {
  parts[1] = parts[1].replace(`is_hidden: false,
            content_type: "movie",`, `is_hidden: false,`);
}
code = parts.join("if (insertAsMusic) {");

fs.writeFileSync('src/app/api/admin/auto-scan/route.ts', code);
