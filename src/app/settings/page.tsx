'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check, Layers, Sparkles } from 'lucide-react'
import { useSmartSidebarStore } from '@/store/useSmartSidebarStore'
import { requestOverlayPermission } from '@/lib/overlayPermission'

type Theme = 'dark' | 'amoled' | 'neon'
type ThumbnailQuality = 'low' | 'medium' | 'high'
type VideoQuality = 'auto' | '360p' | '480p' | '720p' | '1080p'

interface Settings {
  theme: Theme
  smoothMode: boolean
  batterySaver: boolean
  liteAnimation: boolean
  performanceBoost: boolean
  lowData: boolean
  smartLoading: boolean
  autoPlay: boolean
  thumbnailQuality: ThumbnailQuality
  videoQuality: VideoQuality
  showSubtitles: boolean
  autoFitScreen: boolean
  autoUpdate?: boolean
  wifiOnlyUpdate?: boolean
}

const DEFAULT: Settings = {
  theme: 'dark',
  smoothMode: true,
  batterySaver: false,
  liteAnimation: false,
  performanceBoost: false,
  lowData: false,
  smartLoading: true,
  autoPlay: true,
  thumbnailQuality: 'medium',
  videoQuality: 'auto',
  showSubtitles: false,
  autoFitScreen: true,
  autoUpdate: true,
  wifiOnlyUpdate: true,
}

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT
  try {
    const saved = localStorage.getItem('pn_settings')
    if (saved) return { ...DEFAULT, ...JSON.parse(saved) }
  } catch {}
  return DEFAULT
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem('pn_settings', JSON.stringify(s))
  } catch {}
}

function getLocalStorageSize(): string {
  try {
    let total = 0
    for (const key of Object.keys(localStorage)) {
      const val = localStorage.getItem(key) || ''
      total += key.length + val.length
    }
    const kb = total / 1024
    if (kb > 1024) return `${(kb / 1024).toFixed(1)} MB`
    return `${kb.toFixed(0)} KB`
  } catch {
    return '—'
  }
}

// ── Styles OUTSIDE component ───────────────
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#0D0D0D',
  paddingBottom: 96,
  fontFamily: 'system-ui, sans-serif',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '16px 12px 12px',
  position: 'sticky',
  top: 0,
  zIndex: 40,
  backgroundColor: '#0D0D0D',
  borderBottom: '1px solid #1A1A2E',
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 10,
  paddingLeft: 4,
  fontFamily: 'system-ui, sans-serif',
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#1A1A2E',
  borderRadius: 16,
  border: '1px solid #2D2D44',
  overflow: 'hidden',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '0 16px',
  minHeight: 54,
}

const rowLabelStyle: React.CSSProperties = {
  color: '#FFFFFF',
  fontSize: 14,
  fontFamily: 'system-ui, sans-serif',
  margin: 0,
}

const rowSubStyle: React.CSSProperties = {
  color: '#6B7280',
  fontSize: 11,
  fontFamily: 'system-ui, sans-serif',
  marginTop: 2,
}

const rowDivStyle: React.CSSProperties = {
  borderBottom: '1px solid #0D0D0D',
}

const sheetStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 56,
  backgroundColor: '#0D0D0D',
  borderTop: '1px solid #1A1A2E',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: '24px 24px 40px',
}

const handleStyle: React.CSSProperties = {
  width: 40,
  height: 4,
  backgroundColor: '#2D2D44',
  borderRadius: 999,
  margin: '0 auto 20px',
}

// ── Toggle — OUTSIDE component ─────────────
interface ToggleProps {
  value: boolean
  onChange: () => void
}
function Toggle({ value, onChange }: ToggleProps) {
  return (
    <button
      onClick={onChange}
      className="active:opacity-60"
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        position: 'relative',
        flexShrink: 0,
        border: 'none',
        cursor: 'pointer',
        backgroundColor: value ? '#7C3AED' : '#374151',
        transition: 'background-color 0.15s',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2,
        width: 20,
        height: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: '50%',
        transition: 'transform 0.15s',
        transform: value
          ? 'translateX(22px)'
          : 'translateX(2px)',
      }} />
    </button>
  )
}

// ── SettingRow — OUTSIDE component ─────────
interface RowProps {
  label: string
  sublabel?: string
  right: React.ReactNode
  onPress?: () => void
  noBorder?: boolean
  highlight?: boolean
}
function SettingRow({
  label, sublabel, right,
  onPress, noBorder, highlight,
}: RowProps) {
  return (
    <div
      onClick={onPress}
      className={onPress ? 'active:opacity-60' : ''}
      style={{
        ...rowStyle,
        ...(!noBorder ? rowDivStyle : {}),
        backgroundColor: highlight
          ? 'rgba(124,58,237,0.08)' : 'transparent',
        cursor: onPress ? 'pointer' : 'default',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          ...rowLabelStyle,
          color: highlight ? '#A78BFA' : '#FFFFFF',
          fontWeight: highlight ? 500 : 400,
        }}>
          {label}
        </p>
        {sublabel && (
          <p style={rowSubStyle}>{sublabel}</p>
        )}
      </div>
      {right}
    </div>
  )
}

// ── Main Component ─────────────────────────
export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || ''

  const [settings, setSettings] =
    useState<Settings>(DEFAULT)
  const [showResetModal, setShowResetModal] =
    useState(false)
  const [resetInput, setResetInput] =
    useState('')
  const [showQualitySheet, setShowQualitySheet] =
    useState(false)
  const [showVideoQSheet, setShowVideoQSheet] =
    useState(false)
  const [toast, setToast] =
    useState<string | null>(null)
  const [storageSize, setStorageSize] =
    useState('—')
  const [updateInfo, setUpdateInfo] =
    useState<any>(null)
  const [checkingUpdate, setCheckingUpdate] =
    useState(false)

  // Smart Sidebar Store
  const isSmartSidebarEnabled = useSmartSidebarStore((s) => s.isEnabled)
  const setIsSmartSidebarEnabled = useSmartSidebarStore((s) => s.setIsEnabled)
  const isSmartSidebarOpen = useSmartSidebarStore((s) => s.isOpen)
  const setIsSmartSidebarOpen = useSmartSidebarStore((s) => s.setIsOpen)
  const overlayPermissionGranted = useSmartSidebarStore((s) => s.overlayPermissionGranted)
  const setOverlayPermissionGranted = useSmartSidebarStore((s) => s.setOverlayPermissionGranted)

  const checkForUpdate = async () => {
    setCheckingUpdate(true)
    try {
      const res = await fetch('/api/app-version')
      const data = await res.json()
      setUpdateInfo(data)
    } catch {}
    setCheckingUpdate(false)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Load settings on mount
  useEffect(() => {
    setSettings(loadSettings())
    setStorageSize(getLocalStorageSize())
  }, [])

  // Apply theme + save on change
  useEffect(() => {
    const root = document.documentElement
    const bgs: Record<Theme, string> = {
      dark: '#0D0D0D',
      amoled: '#000000',
      neon: '#0B0B1E',
    }
    root.style.setProperty('--bg-base',
      bgs[settings.theme])
    document.body.style.backgroundColor =
      bgs[settings.theme]
    saveSettings(settings)
  }, [settings])

  // Scroll to section
  useEffect(() => {
    if (!activeTab) return
    setTimeout(() => {
      const el = document.getElementById(activeTab)
      if (el) el.scrollIntoView({
        behavior: 'smooth', block: 'start'
      })
    }, 100)
  }, [activeTab])

  const update = (key: keyof Settings, val: any) => {
    setSettings(prev => ({ ...prev, [key]: val }))
  }

  const handleClearCache = () => {
    const keep = ['pn_settings', 'pn_notif_enabled']
    for (const key of Object.keys(localStorage)) {
      if (!keep.includes(key)) {
        localStorage.removeItem(key)
      }
    }
    setStorageSize(getLocalStorageSize())
    showToast('Cache cleared successfully')
  }

  const handleBackupPlaylists = async () => {
    try {
      const data =
        localStorage.getItem('pn_music_queue') || '[]'
      const blob = new Blob([data],
        { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'playnexa-playlists.json'
      a.click()
      URL.revokeObjectURL(url)
      showToast('Backup downloaded')
    } catch {
      showToast('Backup failed. Try again.')
    }
  }

  const handleReset = () => {
    if (resetInput !== 'RESET') return
    localStorage.clear()
    setSettings(DEFAULT)
    setShowResetModal(false)
    setResetInput('')
    window.location.href = '/'
  }

  return (
    <div style={pageStyle}>

      {/* Header */}
      <div style={headerStyle}>
        <button
          onClick={() => router.back()}
          className="active:opacity-60"
          style={{
            width: 40, height: 40,
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
        <h1 style={{
          color: '#FFFFFF',
          fontSize: 18,
          fontWeight: 700,
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
        }}>
          Settings
        </h1>
      </div>

      <div style={{
        padding: '16px 16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>

        {/* APPEARANCE */}
        <section id="appearance">
          <p style={sectionLabelStyle}>
            Appearance
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
          }}>
            {[
              { id: 'dark' as Theme,
                label: 'Dark',
                bg: '#0D0D0D',
                card: '#1A1A2E' },
              { id: 'amoled' as Theme,
                label: 'AMOLED',
                bg: '#000000',
                card: '#111111' },
              { id: 'neon' as Theme,
                label: 'Neon',
                bg: '#0B0B1E',
                card: '#141430' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() =>
                  update('theme', t.id)}
                className="active:opacity-70"
                style={{
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: `2px solid ${
                    settings.theme === t.id
                      ? '#7C3AED' : '#2D2D44'}`,
                  cursor: 'pointer',
                  padding: 0,
                  background: 'none',
                }}
              >
                <div style={{
                  height: 56,
                  position: 'relative',
                  backgroundColor: t.bg,
                }}>
                  <div style={{
                    position: 'absolute',
                    left: 8, right: 8, top: 8,
                    height: 8, borderRadius: 999,
                    backgroundColor: t.card,
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: 16, right: 16, top: 22,
                    height: 6, borderRadius: 999,
                    backgroundColor: t.card,
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: 24, right: 24, bottom: 8,
                    height: 6, borderRadius: 999,
                    backgroundColor: t.card,
                  }} />
                  {settings.theme === t.id && (
                    <div style={{
                      position: 'absolute',
                      top: 6, right: 6,
                      width: 20, height: 20,
                      borderRadius: '50%',
                      backgroundColor: '#7C3AED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Check size={11}
                        color="white"
                        strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div style={{
                  padding: '6px 0',
                  backgroundColor: t.card,
                  borderTop: '1px solid #2D2D44',
                }}>
                  <p style={{
                    fontSize: 11,
                    fontWeight: 500,
                    textAlign: 'center',
                    fontFamily: 'system-ui, sans-serif',
                    color: settings.theme === t.id
                      ? '#A78BFA' : '#9CA3AF',
                    margin: 0,
                  }}>
                    {t.label}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* LANGUAGE */}
        <section id="language">
          <p style={sectionLabelStyle}>Language</p>
          <div style={cardStyle}>
            <SettingRow
              label="App Language"
              sublabel="Current: English"
              highlight={activeTab === 'language'}
              noBorder
              right={
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{
                    color: '#9CA3AF',
                    fontSize: 13,
                    fontFamily: 'system-ui, sans-serif',
                  }}>
                    English
                  </span>
                  <ChevronRight
                    size={16} color="#4B5563" />
                </div>
              }
            />
          </div>
        </section>

        {/* SECURITY */}
        <section id="security">
          <p style={sectionLabelStyle}>
            Account & Security
          </p>
          <div style={cardStyle}>
            <SettingRow
              label="Email Verification"
              sublabel="Account is secured"
              highlight={activeTab === 'security'}
              right={
                <span style={{
                  color: '#22C55E',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'system-ui, sans-serif',
                }}>
                  Verified
                </span>
              }
            />
            <SettingRow
              label="Change Password"
              sublabel="Update your password"
              noBorder
              onPress={() =>
                router.push('/auth/change-password')}
              right={
                <ChevronRight
                  size={16} color="#4B5563" />
              }
            />
          </div>
        </section>

        {/* REALME 7 SMART SIDEBAR */}
        <section id="sidebar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ ...sectionLabelStyle, marginBottom: 0 }}>
              Smart Sidebar (Realme 7 Feature)
            </p>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#A78BFA',
              backgroundColor: 'rgba(124, 58, 237, 0.15)',
              padding: '2px 8px',
              borderRadius: 6,
              border: '1px solid rgba(124, 58, 237, 0.3)',
            }}>
              ColorOS
            </span>
          </div>

          <div style={cardStyle}>
            <SettingRow
              label="Floating Smart Sidebar"
              sublabel="Slide-out edge panel for live download progress & quick tools"
              right={
                <Toggle
                  value={isSmartSidebarEnabled}
                  onChange={() => {
                    const next = !isSmartSidebarEnabled
                    setIsSmartSidebarEnabled(next)
                    showToast(next ? 'Smart Sidebar enabled' : 'Smart Sidebar disabled')
                  }}
                />
              }
            />

            {isSmartSidebarEnabled && (
              <>
                <SettingRow
                  label="Test Slide Open"
                  sublabel="Preview the Smart Sidebar panel"
                  onPress={() => setIsSmartSidebarOpen(true)}
                  right={
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <span style={{
                        color: '#A78BFA',
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: 'system-ui, sans-serif',
                      }}>
                        Open
                      </span>
                      <ChevronRight size={16} color="#A78BFA" />
                    </div>
                  }
                />

                <SettingRow
                  label="Draw Over Other Apps (Overlay)"
                  sublabel={overlayPermissionGranted ? "System overlay permission granted" : "Click to configure floating overlay permission"}
                  noBorder
                  onPress={async () => {
                    const ok = await requestOverlayPermission()
                    if (ok) {
                      setOverlayPermissionGranted(true)
                      showToast('System Overlay permission active')
                    }
                  }}
                  right={
                    <span style={{
                      color: overlayPermissionGranted ? '#22C55E' : '#EAB308',
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: 'system-ui, sans-serif',
                    }}>
                      {overlayPermissionGranted ? 'Granted' : 'Configure'}
                    </span>
                  }
                />
              </>
            )}
          </div>
        </section>

        {/* PERFORMANCE */}
        <section id="performance">
          <p style={sectionLabelStyle}>
            Performance
          </p>
          <div style={cardStyle}>
            <SettingRow
              label="Smooth Mode"
              sublabel="Optimized rendering for speed"
              right={
                <Toggle
                  value={settings.smoothMode}
                  onChange={() =>
                    update('smoothMode',
                      !settings.smoothMode)}
                />
              }
            />
            <SettingRow
              label="Battery Saver"
              sublabel="Reduce animations to save power"
              right={
                <Toggle
                  value={settings.batterySaver}
                  onChange={() =>
                    update('batterySaver',
                      !settings.batterySaver)}
                />
              }
            />
            <SettingRow
              label="Lite Animation"
              sublabel="Minimal transitions"
              right={
                <Toggle
                  value={settings.liteAnimation}
                  onChange={() =>
                    update('liteAnimation',
                      !settings.liteAnimation)}
                />
              }
            />
            <SettingRow
              label="Performance Boost"
              sublabel="Faster start, less preloading"
              noBorder
              right={
                <Toggle
                  value={settings.performanceBoost}
                  onChange={() =>
                    update('performanceBoost',
                      !settings.performanceBoost)}
                />
              }
            />
          </div>
        </section>

        {/* VIDEO */}
        <section>
          <p style={sectionLabelStyle}>Video</p>
          <div style={cardStyle}>
            <SettingRow
              label="Default Quality"
              sublabel="Video playback resolution"
              onPress={() => setShowVideoQSheet(true)}
              right={
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{
                    color: '#9CA3AF',
                    fontSize: 13,
                    fontFamily: 'system-ui, sans-serif',
                    textTransform: 'uppercase',
                  }}>
                    {settings.videoQuality === 'auto'
                      ? 'Auto' : settings.videoQuality}
                  </span>
                  <ChevronRight
                    size={16} color="#4B5563" />
                </div>
              }
            />
            <SettingRow
              label="Auto-fit Screen"
              sublabel="Stretch video to fill screen"
              right={
                <Toggle
                  value={settings.autoFitScreen}
                  onChange={() =>
                    update('autoFitScreen',
                      !settings.autoFitScreen)}
                />
              }
            />
            <SettingRow
              label="Show Subtitles"
              sublabel="When available"
              noBorder
              right={
                <Toggle
                  value={settings.showSubtitles}
                  onChange={() =>
                    update('showSubtitles',
                      !settings.showSubtitles)}
                />
              }
            />
          </div>
        </section>

        {/* NETWORK */}
        <section>
          <p style={sectionLabelStyle}>
            Network & Data
          </p>
          <div style={cardStyle}>
            <SettingRow
              label="Low Data Mode"
              sublabel="Load lower quality thumbnails"
              right={
                <Toggle
                  value={settings.lowData}
                  onChange={() =>
                    update('lowData',
                      !settings.lowData)}
                />
              }
            />
            <SettingRow
              label="Smart Loading"
              sublabel="Pre-load while browsing"
              right={
                <Toggle
                  value={settings.smartLoading}
                  onChange={() =>
                    update('smartLoading',
                      !settings.smartLoading)}
                />
              }
            />
            <SettingRow
              label="Auto-play Next"
              sublabel="Play next video automatically"
              right={
                <Toggle
                  value={settings.autoPlay}
                  onChange={() =>
                    update('autoPlay',
                      !settings.autoPlay)}
                />
              }
            />
            <SettingRow
              label="Thumbnail Quality"
              sublabel="Image quality in lists"
              noBorder
              onPress={() => setShowQualitySheet(true)}
              right={
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{
                    color: '#9CA3AF',
                    fontSize: 13,
                    fontFamily: 'system-ui, sans-serif',
                    textTransform: 'capitalize',
                  }}>
                    {settings.thumbnailQuality}
                  </span>
                  <ChevronRight
                    size={16} color="#4B5563" />
                </div>
              }
            />
          </div>
        </section>

        {/* STORAGE */}
        <section>
          <p style={sectionLabelStyle}>Storage</p>
          <div style={{
            ...cardStyle,
            padding: 16,
          }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}>
                <span style={{
                  color: '#9CA3AF',
                  fontSize: 12,
                  fontFamily: 'system-ui, sans-serif',
                }}>
                  App Data Used
                </span>
                <span style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontFamily: 'system-ui, sans-serif',
                }}>
                  {storageSize}
                </span>
              </div>
              <div style={{
                height: 6,
                backgroundColor: '#0D0D0D',
                borderRadius: 999,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: '30%',
                  backgroundColor: '#7C3AED',
                  borderRadius: 999,
                }} />
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <button
              onClick={handleClearCache}
              className="active:opacity-60"
              style={{
                width: '100%',
                height: 48,
                backgroundColor: '#1A1A2E',
                border: '1px solid #2D2D44',
                borderRadius: 14,
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'system-ui, sans-serif',
                cursor: 'pointer',
              }}
            >
              Clear Cache
            </button>
            <button
              onClick={handleBackupPlaylists}
              className="active:opacity-60"
              style={{
                width: '100%',
                height: 48,
                backgroundColor: '#1A1A2E',
                border: '1px solid #2D2D44',
                borderRadius: 14,
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'system-ui, sans-serif',
                cursor: 'pointer',
              }}
            >
              Backup Playlists
            </button>
          </div>
        </section>

        {/* APP UPDATES */}
        <section id="updates">
          <p style={sectionLabelStyle}>
            App Updates
          </p>
          <div style={cardStyle}>
            <SettingRow
              label="Auto Update"
              sublabel="Download updates automatically"
              right={
                <Toggle
                  value={settings.autoUpdate ?? true}
                  onChange={() =>
                    update('autoUpdate',
                      !settings.autoUpdate)}
                />
              }
            />
            <SettingRow
              label="Wi-Fi Only"
              sublabel="Download updates on Wi-Fi only"
              noBorder
              right={
                <Toggle
                  value={settings.wifiOnlyUpdate ?? true}
                  onChange={() =>
                    update('wifiOnlyUpdate',
                      !settings.wifiOnlyUpdate)}
                />
              }
            />
          </div>

          <button
            onClick={checkForUpdate}
            disabled={checkingUpdate}
            className="active:opacity-60 cursor-pointer"
            style={{
              width: '100%',
              height: 48,
              backgroundColor: '#1A1A2E',
              border: '1px solid #2D2D44',
              borderRadius: 14,
              color: checkingUpdate
                ? '#6B7280' : '#FFFFFF',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'system-ui, sans-serif',
              cursor: checkingUpdate ? 'default' : 'pointer',
              marginTop: 8,
            }}
          >
            {checkingUpdate
              ? 'Checking...'
              : 'Check for Updates'}
          </button>

          {updateInfo && (
            <div style={{
              marginTop: 8,
              padding: 12,
              backgroundColor: '#1A1A2E',
              borderRadius: 12,
              border: updateInfo.hasUpdate
                ? '1px solid rgba(124,58,237,0.4)'
                : '1px solid #2D2D44',
            }}>
              {updateInfo.hasUpdate ? (
                <>
                  <p style={{
                    color: '#A78BFA',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'system-ui, sans-serif',
                    margin: 0,
                  }}>
                    Update available: v{updateInfo.latestVersion}
                  </p>
                  {updateInfo.downloadUrl && (
                    <button
                      onClick={() =>
                        window.open(
                          updateInfo.downloadUrl, '_blank')}
                      className="active:opacity-80 cursor-pointer"
                      style={{
                        marginTop: 8,
                        padding: '8px 16px',
                        backgroundColor: '#7C3AED',
                        borderRadius: 10,
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: 13,
                        fontFamily: 'system-ui, sans-serif',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Download Update
                    </button>
                  )}
                </>
              ) : (
                <p style={{
                  color: '#22C55E',
                  fontSize: 13,
                  fontFamily: 'system-ui, sans-serif',
                  margin: 0,
                }}>
                  App is up to date (v{updateInfo.currentVersion})
                </p>
              )}
            </div>
          )}
        </section>

        {/* DANGER ZONE */}
        <section>
          <p style={sectionLabelStyle}>
            Danger Zone
          </p>
          <button
            onClick={() => setShowResetModal(true)}
            className="active:opacity-60"
            style={{
              width: '100%',
              height: 48,
              backgroundColor: '#1A1A2E',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 14,
              color: '#EF4444',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'system-ui, sans-serif',
              cursor: 'pointer',
            }}
          >
            Reset App
          </button>
          <p style={{
            color: '#6B7280',
            fontSize: 11,
            textAlign: 'center',
            marginTop: 6,
            fontFamily: 'system-ui, sans-serif',
          }}>
            Clears all local data and preferences
          </p>
        </section>

        <p style={{
          textAlign: 'center',
          color: '#4B5563',
          fontSize: 11,
          fontFamily: 'system-ui, sans-serif',
          paddingBottom: 8,
        }}>
          Play Nexa v1.0.0
        </p>
      </div>

      {/* Thumbnail Quality Sheet */}
      {showQualitySheet && (
        <>
          <div
            onClick={() => setShowQualitySheet(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 55,
              backgroundColor: 'rgba(0,0,0,0.7)',
            }}
          />
          <div style={sheetStyle}>
            <div style={handleStyle} />
            <p style={{
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 18,
              fontFamily: 'system-ui, sans-serif',
              marginBottom: 16,
            }}>
              Thumbnail Quality
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {[('low' as ThumbnailQuality), ('medium' as ThumbnailQuality), ('high' as ThumbnailQuality)].map(q => (
                <button
                  key={q}
                  onClick={() => {
                    update('thumbnailQuality', q)
                    setShowQualitySheet(false)
                  }}
                  className="active:opacity-70"
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: 'system-ui, sans-serif',
                    border: `1px solid ${
                      settings.thumbnailQuality === q
                        ? 'rgba(124,58,237,0.4)'
                        : '#2D2D44'}`,
                    backgroundColor:
                      settings.thumbnailQuality === q
                        ? 'rgba(124,58,237,0.12)'
                        : '#1A1A2E',
                    color:
                      settings.thumbnailQuality === q
                        ? '#A78BFA' : '#FFFFFF',
                  }}
                >
                  {q}
                  {settings.thumbnailQuality === q && (
                    <Check size={16}
                      color="#A78BFA"
                      strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Video Quality Sheet */}
      {showVideoQSheet && (
        <>
          <div
            onClick={() => setShowVideoQSheet(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 55,
              backgroundColor: 'rgba(0,0,0,0.7)',
            }}
          />
          <div style={sheetStyle}>
            <div style={handleStyle} />
            <p style={{
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 18,
              fontFamily: 'system-ui, sans-serif',
              marginBottom: 16,
            }}>
              Video Quality
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {[('auto' as VideoQuality), ('360p' as VideoQuality), ('480p' as VideoQuality), ('720p' as VideoQuality), ('1080p' as VideoQuality)].map(q => (
                <button
                  key={q}
                  onClick={() => {
                    update('videoQuality', q)
                    setShowVideoQSheet(false)
                  }}
                  className="active:opacity-70"
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    cursor: 'pointer',
                    textTransform: q === 'auto'
                      ? 'none' : 'uppercase',
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: 'system-ui, sans-serif',
                    border: `1px solid ${
                      settings.videoQuality === q
                        ? 'rgba(124,58,237,0.4)'
                        : '#2D2D44'}`,
                    backgroundColor:
                      settings.videoQuality === q
                        ? 'rgba(124,58,237,0.12)'
                        : '#1A1A2E',
                    color:
                      settings.videoQuality === q
                        ? '#A78BFA' : '#FFFFFF',
                  }}
                >
                  {q === 'auto' ? 'Auto' : q}
                  {settings.videoQuality === q && (
                    <Check size={16}
                      color="#A78BFA"
                      strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <>
          <div
            onClick={() => {
              setShowResetModal(false)
              setResetInput('')
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 55,
              backgroundColor: 'rgba(0,0,0,0.7)',
            }}
          />
          <div style={sheetStyle}>
            <div style={handleStyle} />
            <h3 style={{
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 18,
              fontFamily: 'system-ui, sans-serif',
              marginBottom: 6,
            }}>
              Reset App
            </h3>
            <p style={{
              color: '#9CA3AF',
              fontSize: 14,
              fontFamily: 'system-ui, sans-serif',
              marginBottom: 20,
              lineHeight: 1.5,
            }}>
              This clears all data and signs you out.
              Type{' '}
              <strong style={{ color: '#FFFFFF' }}>
                RESET
              </strong>
              {' '}to confirm.
            </p>
            <input
              type="text"
              value={resetInput}
              onChange={e =>
                setResetInput(e.target.value)}
              placeholder="Type RESET to confirm"
              style={{
                width: '100%',
                height: 48,
                backgroundColor: '#1A1A2E',
                border: `1px solid ${
                  resetInput === 'RESET'
                    ? '#EF4444'
                    : '#2D2D44'}`,
                borderRadius: 12,
                padding: '0 16px',
                color: '#FFFFFF',
                fontSize: 14,
                fontFamily: 'system-ui, sans-serif',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 12,
              }}
            />
            <button
              onClick={handleReset}
              disabled={resetInput !== 'RESET'}
              className="active:opacity-80"
              style={{
                width: '100%',
                height: 48,
                backgroundColor: '#EF4444',
                borderRadius: 14,
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 14,
                fontFamily: 'system-ui, sans-serif',
                border: 'none',
                cursor: 'pointer',
                opacity: resetInput === 'RESET'
                  ? 1 : 0.4,
                marginBottom: 8,
              }}
            >
              Reset Everything
            </button>
            <button
              onClick={() => {
                setShowResetModal(false)
                setResetInput('')
              }}
              className="active:opacity-60"
              style={{
                width: '100%',
                height: 48,
                backgroundColor: '#1A1A2E',
                border: '1px solid #2D2D44',
                borderRadius: 14,
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 14,
                fontFamily: 'system-ui, sans-serif',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 96,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1A1A2E',
          border: '1px solid #2D2D44',
          color: '#FFFFFF',
          padding: '10px 20px',
          borderRadius: 12,
          fontSize: 13,
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 500,
          zIndex: 60,
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
