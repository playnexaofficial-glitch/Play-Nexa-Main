export default function VideoLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0D0D0D',
      paddingBottom: 80,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 16px 8px',
      }}>
        <div style={{
          height: 22,
          width: 130,
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

      {/* Tabs skeleton */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '8px 16px',
      }}>
        {[70, 65].map((w, i) => (
          <div key={i} style={{
            height: 32,
            width: w,
            backgroundColor: '#1A1A2E',
            borderRadius: 999,
          }} />
        ))}
      </div>

      {/* Grid skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        padding: '8px 16px',
      }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div style={{
              width: '100%',
              aspectRatio: '16/9',
              backgroundColor: '#1A1A2E',
              borderRadius: 12,
            }} />
            <div style={{
              height: 12,
              width: '80%',
              backgroundColor: '#141420',
              borderRadius: 6,
              marginTop: 8,
            }} />
            <div style={{
              height: 10,
              width: '55%',
              backgroundColor: '#141420',
              borderRadius: 5,
              marginTop: 4,
            }} />
          </div>
        ))}
      </div>
    </div>
  )
}
