'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { ShieldCheck } from 'lucide-react'

export default function AdminVerify2FAPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth) {
      setChecking(false)
      return
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/admin/login')
        return
      }

      // Check if 2FA is already verified
      try {
        const res = await fetch('/api/admin/verify-2fa')
        if (res.ok) {
          const data = await res.json()
          if (data.verified) {
            router.replace('/admin/dashboard')
            return
          }
        }
      } catch {}

      setChecking(false)
    })

    return () => unsub()
  }, [router])

  const handleVerify = async () => {
    const cleanPhone = phone.trim()
    const cleanPassphrase = passphrase.trim()

    if (!cleanPhone || !cleanPassphrase) {
      setError('ফোন নম্বর এবং পাসফ্রেজ প্রবেশ করান')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, passphrase: cleanPassphrase }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok && data.success) {
        router.replace('/admin/dashboard')
        return
      } else {
        setError(data.error || 'Invalid verification details')
        setLoading(false)
      }
    } catch {
      setError('Verification failed. Please try again.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={24} color="#A78BFA" />
          </div>
          <h1 className="text-2xl font-bold">
            <span style={{ color: '#7C3AED' }}>Play</span>
            <span className="text-white">Nexa</span>
          </h1>
          <p className="text-[#9CA3AF] text-sm mt-1">Two-Factor Admin Verification</p>
        </div>

        <div className="bg-[#0F0F1A] border border-[#2D2D44] rounded-2xl p-6">
          {error && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-[#9CA3AF] text-xs mb-2 block">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="+8801XXXXXXXXX"
                className="w-full h-12 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563]"
              />
            </div>

            <div>
              <label className="text-[#9CA3AF] text-xs mb-2 block">
                Security Passphrase
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="••••••••••••"
                className="w-full h-12 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563]"
              />
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full h-12 bg-[#7C3AED] rounded-xl text-white font-semibold text-sm disabled:opacity-50 active:opacity-60 flex items-center justify-center gap-2 min-h-[44px]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Verify & Access'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
