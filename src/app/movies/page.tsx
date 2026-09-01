import type { Metadata } from 'next'
import MoviesPageClient from '@/components/movies/MoviesPageClient'

export const metadata: Metadata = {
  title:
    'Free Movies & Natok — Bangla, Hindi ' +
    'Watch Online',
  description:
    'Watch free Bangla movies, Hindi dubbed ' +
    'movies, Bangla natok, web series, eid ' +
    'natok, telefilm online. New movies and ' +
    'dramas added daily. No account needed. ' +
    'HD quality streaming free.',
  keywords: [
    'bangla movie watch online free',
    'bangla natok 2024',
    'hindi movie free watch',
    'natok online free',
    'bangla web series free',
    'eid natok 2024',
    'bongo movies',
    'south ki cinema',
    'rmg entertainment',
    'jxona movies',
    'bangla telefilm',
    'new bangla movie',
    'full bangla movie',
    'hindi dubbed bangla movie',
    'action movie bangla',
    'romantic bangla movie',
    'comedy natok',
  ],
  openGraph: {
    title:
      'Free Movies & Natok | Play Nexa',
    description:
      'Watch Bangla movies, natok, ' +
      'web series online free.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/movies',
  },
}

export default function MoviesPage() {
  return <MoviesPageClient />
}
