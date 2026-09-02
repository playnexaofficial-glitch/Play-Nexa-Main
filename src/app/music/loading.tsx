export default function MusicLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0D0D0D',
      paddingBottom: 80,
    }}>
      {/* Header skeleton */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 12px 12px',
        borderBottom: '1px solid #1A1A2E',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flex: 1,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#1A1A2E',
          }} />
          <div>
            <div style={{
              height: 16,
              width: 100,
              backgroundColor: '#1A1A2E',
              borderRadius: 6,
              marginBottom: 6,
            }} />
            <div style={{
              height: 10,
              width: 130,
              backgroundColor: '#141420',
              borderRadius: 5,
            }} />
          </div>
        </div>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: '#1A1A2E',
        }} />
      </div>

      {/* Track list skeleton */}
      <div style={{
        padding: '16px 16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            borderRadius: 14,
            border: '1px solid #2D2D44',
            backgroundColor: '#1A1A2E',
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#141420',
              flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{
                height: 13,
                width: '70%',
                backgroundColor: '#141420',
                borderRadius: 6,
                marginBottom: 6,
              }} />
              <div style={{
                height: 10,
                width: '40%',
                backgroundColor: '#0D0D0D',
                borderRadius: 5,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
