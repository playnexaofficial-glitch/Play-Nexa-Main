"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VideoWatchPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/video')
  }, [router])

  return (
    <div className="min-h-screen bg-[#0D0D0D]" />
  )
}
