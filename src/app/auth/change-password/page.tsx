'use client';
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { changeUserPassword } from '@/lib/firebaseAuth'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!currentPassword) {
      setError('Please enter your current password')
      return
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    setIsLoading(true)

    const { error: changeErr } = await changeUserPassword(currentPassword, newPassword)

    setIsLoading(false)

    if (changeErr) {
      setError(changeErr)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/settings')
    }, 1800)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0D0D0D',
        color: '#FFFFFF',
        fontFamily: 'system-ui, sans-serif',
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 12px 12px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#0D0D0D',
          borderBottom: '1px solid #1A1A2E',
        }}
      >
        <button
          onClick={() => router.back()}
          className="active:opacity-60"
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </button>
        <h1
          style={{
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: 700,
            margin: 0,
          }}
        >
          Change Password
        </h1>
      </div>

      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: '24px 16px',
        }}
      >
        {success ? (
          <div
            style={{
              backgroundColor: '#1A1A2E',
              border: '1px solid #2D2D44',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle2 size={28} color="#22C55E" />
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#FFFFFF',
                marginBottom: 8,
              }}
            >
              Password Updated
            </h2>
            <p
              style={{
                fontSize: 14,
                color: '#9CA3AF',
                marginBottom: 20,
              }}
            >
              Your account password has been changed successfully. Redirecting to settings...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: '#1A1A2E',
              border: '1px solid #2D2D44',
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(124, 58, 237, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={18} color="#A78BFA" />
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Update Password</h2>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                  Enter your current and new password below
                </p>
              </div>
            </div>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  color: '#F87171',
                  fontSize: 13,
                }}
              >
                <AlertCircle size={16} color="#F87171" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#9CA3AF',
                  marginBottom: 6,
                }}
              >
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                style={{
                  width: '100%',
                  height: 48,
                  backgroundColor: '#0D0D0D',
                  border: '1px solid #2D2D44',
                  borderRadius: 12,
                  padding: '0 14px',
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#9CA3AF',
                  marginBottom: 6,
                }}
              >
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                style={{
                  width: '100%',
                  height: 48,
                  backgroundColor: '#0D0D0D',
                  border: '1px solid #2D2D44',
                  borderRadius: 12,
                  padding: '0 14px',
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#9CA3AF',
                  marginBottom: 6,
                }}
              >
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
                style={{
                  width: '100%',
                  height: 48,
                  backgroundColor: '#0D0D0D',
                  border: '1px solid #2D2D44',
                  borderRadius: 12,
                  padding: '0 14px',
                  color: '#FFFFFF',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="active:opacity-70"
              style={{
                width: '100%',
                height: 48,
                backgroundColor: '#7C3AED',
                border: 'none',
                borderRadius: 12,
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 8,
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
