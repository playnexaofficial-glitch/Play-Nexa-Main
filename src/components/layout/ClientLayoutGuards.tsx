// ── Play Nexa — Client Layout Guards ────────────────────────────────
// Renders BottomNav only on non-admin/auth/player pages
// Single source of truth for hide routes — BottomNav no longer duplicates this
// Separated from root layout so metadata (server) still works

'use client'

import { usePathname } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'

// ── Single source of truth for routes that hide the nav ──
const HIDE_ROUTES = ['/admin', '/auth', '/video', '/player']

export default function ClientLayoutGuards() {
  const pathname = usePathname()

  const shouldHide = HIDE_ROUTES.some(r => pathname.startsWith(r))

  if (shouldHide) return null

  return (
    <>
      <BottomNav />
    </>
  )
}
