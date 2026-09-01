export default function SettingsLoading() {
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
        gap: 12,
        padding: '16px 12px 12px',
        borderBottom: '1px solid #1A1A2E',
      }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: '50%',
          backgroundColor: '#1A1A2E',
        }} />
        <div style={{
          height: 18, width: 80,
          backgroundColor: '#1A1A2E',
          borderRadius: 6,
        }} />
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {[3, 4, 3, 3].map((rows, si) => (
          <div key={si} style={{ marginBottom: 24 }}>
            <div style={{
              height: 10, width: 100,
              backgroundColor: '#141420',
              borderRadius: 5,
              marginBottom: 10,
            }} />
            <div style={{
              backgroundColor: '#1A1A2E',
              borderRadius: 16,
              border: '1px solid #2D2D44',
              overflow: 'hidden',
            }}>
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: 54,
                  padding: '0 16px',
                  borderBottom: i < rows - 1
                    ? '1px solid #0D0D0D' : 'none',
                }}>
                  <div style={{
                    height: 12, width: 130,
                    backgroundColor: '#141420',
                    borderRadius: 5,
                  }} />
                  <div style={{
                    width: 44, height: 24,
                    backgroundColor: '#141420',
                    borderRadius: 999,
                  }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

