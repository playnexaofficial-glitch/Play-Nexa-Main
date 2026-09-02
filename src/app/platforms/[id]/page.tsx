import PlatformDetailClient from './PlatformDetailClient'
import platformsData from '@/data/platforms.json'

export function generateStaticParams() {
  const platforms = (platformsData || []) as any[]
  if (platforms.length > 0) {
    return platforms.map((p: any) => ({ id: p.id }))
  }
  return [{ id: 'default' }]
}

export default function PlatformDetailPage() {
  return <PlatformDetailClient />
}
