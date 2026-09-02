export default function MoviesLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0D0D0D',
      paddingBottom: 96,
    }}>
      {/* Header skeleton */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 16px 8px',
        backgroundColor: '#0D0D0D',
      }}>
        <div style={{
          height: 24,
          width: 140,
          backgroundColor: '#1A1A2E',
          borderRadius: 8,
        }} />
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: '#1A1A2E',
        }} />
      </div>

      {/* Tab buttons skeleton */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '10px 16px 4px',
      }}>
        {[60, 70, 65].map((w, i) => (
          <div key={i} style={{
            height: 34,
            width: w,
            backgroundColor: '#1A1A2E',
            borderRadius: 999,
          }} />
        ))}
      </div>

      {/* Banner skeleton */}
      <div style={{
        margin: '8px 0 24px',
        width: '100%',
        aspectRatio: '16/9',
        backgroundColor: '#1A1A2E',
      }} />

      {/* Section 1 skeleton */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          height: 16,
          width: 120,
          backgroundColor: '#1A1A2E',
          borderRadius: 6,
          marginBottom: 12,
        }} />
        <div style={{
          display: 'flex',
          gap: 12,
          overflow: 'hidden',
        }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              flexShrink: 0,
              width: 144,
            }}>
              <div style={{
                width: 144,
                aspectRatio: '2/3',
                backgroundColor: '#1A1A2E',
                borderRadius: 12,
                marginBottom: 8,
              }} />
              <div style={{
                height: 12,
                width: '80%',
                backgroundColor: '#141420',
                borderRadius: 6,
                marginBottom: 6,
              }} />
              <div style={{
                height: 10,
                width: '55%',
                backgroundColor: '#141420',
                borderRadius: 5,
              }} />
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 skeleton */}
      <div style={{
        padding: '32px 16px 0',
      }}>
        <div style={{
          height: 16,
          width: 100,
          backgroundColor: '#1A1A2E',
          borderRadius: 6,
          marginBottom: 12,
        }} />
        <div style={{
          display: 'flex',
          gap: 12,
          overflow: 'hidden',
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              flexShrink: 0,
              width: 224,
            }}>
              <div style={{
                width: 224,
                aspectRatio: '16/9',
                backgroundColor: '#1A1A2E',
                borderRadius: 12,
                marginBottom: 8,
              }} />
              <div style={{
                height: 12,
                width: '75%',
                backgroundColor: '#141420',
                borderRadius: 6,
              }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

