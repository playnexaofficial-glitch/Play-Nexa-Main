import type { Metadata } from 'next'
import MoviesPageClient from '@/components/movies/MoviesPageClient'

export const metadata: Metadata = {
  title: 'Free Bangla Natok & Telefilms — Watch Online | Play Nexa',
  description:
    'Watch free Bangla natok, comedy dramas, romantic natok, eid specials, and telefilms online in HD quality on Play Nexa. No subscription needed.',
  keywords: [
    'bangla natok watch online free',
    'bangla natok 2024',
    'bangla comedy natok',
    'eid natok',
    'telefilm bangla',
    'romantic natok',
    'play nexa natok',
  ],
  openGraph: {
    title: 'Free Bangla Natok & Telefilms | Play Nexa',
    description: 'Watch Bangla natok and dramas online free in HD.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/natok',
  },
}

export default function NatokPage() {
  return <MoviesPageClient initialContentType="natok" />
}
