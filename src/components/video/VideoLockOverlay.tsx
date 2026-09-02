'use client'
import { Lock, Unlock } from 'lucide-react'

interface VideoLockOverlayProps {
  isLocked: boolean
  lockToast: boolean
  showControls?: boolean
  onToggleLock: () => void
  onUnlock: () => void
}

export default function VideoLockOverlay({
  isLocked,
  lockToast,
  showControls = true,
  onToggleLock,
  onUnlock,
}: VideoLockOverlayProps) {
  // If not locked and controls are hidden, hide the lock button
  if (!isLocked && !showControls) {
    return null
  }

  const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isLocked) {
      onUnlock()
    } else {
      onToggleLock()
    }
  }

  return (
    <>
      {/* Toast locked warning */}
      {isLocked && lockToast && (
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none flex justify-center px-4"
          id="video-lock-toast"
        >
          <div className="bg-[#0D0D0D] border border-amber-500/30 rounded-2xl px-5 py-3 flex items-center gap-2.5">
            <Lock size={16} className="text-amber-400 shrink-0" />
            <p className="text-white text-xs font-semibold tracking-wide text-center">
              Screen locked • Tap the lock icon to unlock
            </p>
          </div>
        </div>
      )}

      {/* Lock controller button overlay */}
      <button
        type="button"
        onClick={handleToggle}
        className={`absolute left-5 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full border flex items-center justify-center active:opacity-60 transition-opacity duration-150 cursor-pointer ${
          isLocked
            ? 'bg-amber-500/20 border-amber-400 text-amber-400 ring-2 ring-amber-400/40'
            : 'bg-[#121220] border-white/20 text-white'
        }`}
        title={isLocked ? 'Click to Unlock Screen' : 'Lock Screen'}
        aria-label={isLocked ? 'Unlock Screen' : 'Lock Screen'}
        id="video-lock-toggle-btn"
      >
        {isLocked ? (
          <Lock size={20} className="text-amber-400 stroke-[2.5]" />
        ) : (
          <Unlock size={20} className="text-white stroke-[2]" />
        )}
      </button>
    </>
  )
}

