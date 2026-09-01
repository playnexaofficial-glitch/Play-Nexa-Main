'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const DISMISSED_KEY = 'pn_install_dismissed'
const APK_URL = 'https://github.com/' +
  'playnexaofficial-glitch/' +
  'Play-Nexa-Official-/releases/latest/' +
  'download/app-debug.apk'

export default function InstallBanner() {
  const [show, setShow] = useState(false)
  const [isNative, setIsNative] = useState(false)

  useEffect(() => {
    // Check if already running in native app
    const native = typeof (window as any)
      .Capacitor !== 'undefined'
    setIsNative(native)

    // Check if user dismissed recently (7 days)
    const dismissed = localStorage.getItem(
      DISMISSED_KEY)
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10)
      const sevenDays =
        7 * 24 * 60 * 60 * 1000
      if (!isNaN(dismissedAt) && Date.now() - dismissedAt < sevenDays) {
        return
      }
    }

    // Show banner if on mobile browser
    // (not in native app, not on desktop)
    const isMobile =
      /Android|iPhone|iPad/i.test(
        navigator.userAgent)
    if (!native && isMobile) {
      const timer = setTimeout(() => setShow(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(
      DISMISSED_KEY,
      Date.now().toString()
    )
    setShow(false)
  }

  const handleInstall = () => {
    window.open(APK_URL, '_blank')
    handleDismiss()
  }

  if (!show || isNative) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: 16,
      right: 16,
      zIndex: 100,
      backgroundColor: '#1A1A2E',
      border: '1px solid #2D2D44',
      borderRadius: 16,
      padding: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 -2px 20px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#CC0000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: 20,
          fontFamily: 'system-ui, sans-serif',
        }}>N</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: '#FFFFFF',
          fontWeight: 700,
          fontSize: 14,
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
        }}>
          Install Play Nexa App
        </p>
        <p style={{
          color: '#9CA3AF',
          fontSize: 12,
          fontFamily: 'system-ui, sans-serif',
          marginTop: 2,
        }}>
          Faster experience, offline music and video
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="active:opacity-80 cursor-pointer"
        style={{
          padding: '8px 16px',
          backgroundColor: '#7C3AED',
          borderRadius: 10,
          color: '#FFFFFF',
          fontWeight: 600,
          fontSize: 13,
          fontFamily: 'system-ui, sans-serif',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="active:opacity-60 cursor-pointer"
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <X size={18} color="#6B7280" />
      </button>
    </div>
  )
}
