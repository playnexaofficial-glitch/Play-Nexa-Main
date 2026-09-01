'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function MusicErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Music page error:', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0D0D0D',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        backgroundColor: '#1A1A2E',
        border: '2px solid #EF4444',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
      }}>
        <AlertCircle size={32} color="#EF4444" />
      </div>
      <h2 style={{
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 700,
        margin: '0 0 8px',
      }}>
        Unable to load Music player
      </h2>
      <p style={{
        color: '#9CA3AF',
        fontSize: 13,
        maxWidth: 320,
        lineHeight: 1.5,
        margin: '0 0 24px',
      }}>
        An error occurred while loading this section. Please reload or try again.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => reset()}
          className="active:opacity-60 cursor-pointer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            backgroundColor: '#7C3AED',
            borderRadius: 12,
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 13,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} color="#FFFFFF" />
          Try Again
        </button>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload()
            }
          }}
          className="active:opacity-60 cursor-pointer"
          style={{
            padding: '10px 20px',
            backgroundColor: '#1A1A2E',
            border: '1px solid #2D2D44',
            borderRadius: 12,
            color: '#9CA3AF',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Reload Page
        </button>
      </div>
    </div>
  )
}
