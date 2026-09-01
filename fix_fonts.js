const fs = require('fs');

let layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
layout = layout.replace(/import { Inter } from "next\/font\/google";\n?/g, '');
layout = layout.replace(/const inter = Inter\(\{[\s\S]*?\}\);\n?/g, '');
layout = layout.replace(/\$\{inter\.variable\} /g, '');
layout = layout.replace(/font-sans/g, ''); // we can just rely on tailwind defaults
fs.writeFileSync('src/app/layout.tsx', layout, 'utf8');

