const fs = require('fs');
let code = fs.readFileSync('src/app/movies/page.tsx', 'utf8');

code = code.replace(
  "const [selectedChannel, setSelectedChannel] =",
  "const [contentType, setContentType] = useState<'all'|'movie'|'natok'>('all')\n  const [selectedChannel, setSelectedChannel] ="
);

code = code.replace(
  "if (selectedChannel !== 'all')\n        params.set('channel', selectedChannel)",
  "if (selectedChannel !== 'all')\n        params.set('channel', selectedChannel)\n      params.set('type', contentType)"
);

code = code.replace(
  "load()\n  }, [userId, selectedChannel])",
  "load()\n  }, [userId, selectedChannel, contentType])"
);

const headerRegex = /\{\/\* Header \*\/\}[\s\S]*?<Search size=\{18\} color="#FFFFFF"\/>\s*<\/button>\s*<\/div>/;
const newHeader = `{/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 sticky top-0 z-40 bg-[#0D0D0D]">
        <h1 className="text-xl font-bold text-white">
          {contentType === 'natok'
            ? 'Natok'
            : contentType === 'movie'
            ? 'Movies'
            : 'Movies & Natok'}
        </h1>
        <button
          onClick={() => router.push('/movies/search')}
          className="w-10 h-10 rounded-full bg-[#1A1A2E] flex items-center justify-center active:opacity-60 transition-opacity duration-150">
          <Search size={18} color="#FFFFFF"/>
        </button>
      </div>

      {/* Content Type Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '8px 16px 4px',
        position: 'sticky',
        top: 60,
        zIndex: 39,
        backgroundColor: '#0D0D0D'
      }}>
        {(['all','movie','natok'] as const).map(t => (
          <button
            key={t}
            onClick={() => setContentType(t)}
            style={{
              padding: '7px 20px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'system-ui, sans-serif',
              backgroundColor:
                contentType === t
                  ? '#7C3AED'
                  : '#1A1A2E',
              color:
                contentType === t
                  ? '#FFFFFF'
                  : '#9CA3AF',
              transition: 'opacity 150ms',
            }}
            className="active:opacity-60"
          >
            {t === 'all' ? 'All'
             : t === 'movie' ? 'Movie'
             : 'Natok'}
          </button>
        ))}
      </div>`;

code = code.replace(headerRegex, newHeader);
fs.writeFileSync('src/app/movies/page.tsx', code);
