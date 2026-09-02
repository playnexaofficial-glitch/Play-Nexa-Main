'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MoviesError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Auto retry after 3 seconds
    const t = setTimeout(() => reset(), 3000)
    return () => clearTimeout(t)
  }, [reset])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0D0D0D',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        backgroundColor: '#1A1A2E',
        border: '2px solid #2D2D44',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
      }}>
        <svg width="28" height="28"
          viewBox="0 0 24 24" fill="none"
          stroke="#EF4444" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h2 style={{
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 700,
        marginBottom: 8,
        textAlign: 'center',
      }}>
        Could not load movies
      </h2>
      <p style={{
        color: '#9CA3AF',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 1.5,
        maxWidth: 260,
      }}>
        Check your connection. Retrying automatically...
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => reset()}
          className="active:opacity-70"
          style={{
            padding: '12px 24px',
            backgroundColor: '#7C3AED',
            borderRadius: 14,
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => router.push('/')}
          className="active:opacity-60"
          style={{
            padding: '12px 24px',
            backgroundColor: '#1A1A2E',
            borderRadius: 14,
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 14,
            border: '1px solid #2D2D44',
            cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  )
}
