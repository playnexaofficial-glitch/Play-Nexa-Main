const fs = require('fs');
let code = fs.readFileSync('src/app/admin/channels/page.tsx', 'utf8');

// Insert State
const stateRegex = /const \[browserSearch, setBrowserSearch\] = useState\(''\)/;
const newState = `const [browserSearch, setBrowserSearch] = useState('')

  const [rssUrl, setRssUrl] = useState('')
  const [rssType, setRssType] = useState<'movies'|'music'|'mixed'>('movies')
  const [rssGemini, setRssGemini] = useState(true)
  const [rssLoading, setRssLoading] = useState(false)
  const [rssResult, setRssResult] = useState<any>(null)

  const handleRssImport = async () => {
    if (!rssUrl.trim() || rssLoading) return
    setRssLoading(true)
    setRssResult(null)
    try {
      const res = await fetch(
        '/api/admin/rss-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channelUrl: rssUrl.trim(),
          channelType: rssType,
          useGemini: rssGemini,
        }),
      })
      const data = await res.json()
      setRssResult(data)
    } catch (e: any) {
      setRssResult({ error: e.message })
    } finally {
      setRssLoading(false)
    }
  }`;
code = code.replace(stateRegex, newState);

// Insert UI
const uiRegex = /<\/div>\n\n\s*<div style=\{\{/
const newUI = `</div>

      <div style={{
        margin: '16px 0',
        padding: 16,
        backgroundColor: '#1A1A2E',
        border: '1px solid #2D2D44',
        borderRadius: 16,
      }}>
        <h2 style={{
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: 700,
          fontFamily: 'system-ui, sans-serif',
          marginBottom: 12,
        }}>
          Fast Channel Import
        </h2>
        <p style={{
          color: '#9CA3AF',
          fontSize: 12,
          fontFamily: 'system-ui, sans-serif',
          marginBottom: 12,
        }}>
          Add any YouTube channel URL.
          No API key required.
          Gemini AI optional for better accuracy.
        </p>

        <input
          type="text"
          value={rssUrl}
          onChange={e => setRssUrl(e.target.value)}
          placeholder="youtube.com/@ChannelName or channel URL"
          style={{
            width: '100%',
            padding: '10px 14px',
            backgroundColor: '#0D0D0D',
            border: '1px solid #2D2D44',
            borderRadius: 10,
            color: '#FFFFFF',
            fontSize: 14,
            fontFamily: 'system-ui, sans-serif',
            marginBottom: 10,
            boxSizing: 'border-box',
          }}
        />

        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 10,
        }}>
          {(['movies','music','mixed'] as const)
            .map(t => (
            <button
              key={t}
              onClick={() => setRssType(t)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'system-ui, sans-serif',
                backgroundColor:
                  rssType === t
                    ? '#7C3AED' : '#0D0D0D',
                color: rssType === t
                  ? '#FFF' : '#9CA3AF',
                border: '1px solid #2D2D44',
              }}
            >
              {t === 'movies' ? 'Movie/Natok'
               : t === 'music' ? 'Music'
               : 'Mixed'}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}>
          <input
            type="checkbox"
            id="useGemini"
            checked={rssGemini}
            onChange={e =>
              setRssGemini(e.target.checked)}
            style={{ accentColor: '#7C3AED' }}
          />
          <label
            htmlFor="useGemini"
            style={{
              color: '#9CA3AF',
              fontSize: 13,
              fontFamily: 'system-ui, sans-serif',
              cursor: 'pointer',
            }}
          >
            Use Gemini AI to verify classification
          </label>
        </div>

        <button
          onClick={handleRssImport}
          disabled={rssLoading || !rssUrl.trim()}
          style={{
            width: '100%',
            padding: '12px 0',
            backgroundColor:
              rssLoading ? '#2D2D44' : '#7C3AED',
            borderRadius: 12,
            border: 'none',
            cursor: rssLoading ? 'default' : 'pointer',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {rssLoading ? 'Importing...' : 'Import Channel'}
        </button>

        {rssResult && !rssResult.error && (
          <div style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: '#0D0D0D',
            borderRadius: 10,
            border: '1px solid #22C55E',
          }}>
            <p style={{
              color: '#22C55E',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'system-ui, sans-serif',
            }}>
              {rssResult.channel?.name} — Import done
            </p>
            <p style={{
              color: '#9CA3AF',
              fontSize: 12,
              fontFamily: 'system-ui, sans-serif',
              marginTop: 4,
            }}>
              Movies: {rssResult.imported?.movies} |
              Natok: {rssResult.imported?.natok} |
              Music: {rssResult.imported?.music} |
              Skipped: {rssResult.imported?.skipped}
            </p>
          </div>
        )}

        {rssResult?.error && (
          <div style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: '#0D0D0D',
            borderRadius: 10,
            border: '1px solid #EF4444',
          }}>
            <p style={{
              color: '#EF4444',
              fontSize: 13,
              fontFamily: 'system-ui, sans-serif',
            }}>
              {rssResult.error}
            </p>
          </div>
        )}
      </div>

      <div style={{`;

code = code.replace(uiRegex, newUI);

fs.writeFileSync('src/app/admin/channels/page.tsx', code);
