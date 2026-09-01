const fs = require('fs');
let code = fs.readFileSync('src/app/movies/page.tsx', 'utf8');

// Add state
code = code.replace(
  "const [selectedChannel, setSelectedChannel] =",
  "const [contentType, setContentType] = useState<'all'|'movie'|'natok'>('all')\n  const [selectedChannel, setSelectedChannel] ="
);

// Add param
code = code.replace(
  "if (selectedChannel !== 'all')\n        params.set('channel', selectedChannel)",
  "if (selectedChannel !== 'all')\n        params.set('channel', selectedChannel)\n      params.set('type', contentType)"
);

// Add dependency
code = code.replace(
  "load()\n  }, [userId, selectedChannel])",
  "load()\n  }, [userId, selectedChannel, contentType])"
);

// Update title and insert tab buttons
const titleRegex = /<h1 className="text-xl font-bold\s+text-white">Movies<\/h1>/;
const tabsCode = `
        <h1 className="text-xl font-bold text-white">
          {contentType === 'natok'
            ? 'Natok'
            : contentType === 'movie'
            ? 'Movies'
            : 'Movies & Natok'}
        </h1>
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
      </div>
`;
code = code.replace(titleRegex, tabsCode.trim() + '\n      <div style={{ display: "none" }}>');
// Let's manually replace the header block to be safe.
