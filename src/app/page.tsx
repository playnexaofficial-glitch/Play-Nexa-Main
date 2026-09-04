import type { Metadata } from 'next'
import HomeFeedClient from '@/components/home/HomeFeedClient'

export const metadata: Metadata = {
  title: 'Play Nexa — Free Movies, Bangla Natok, Games & Entertainment',
  description:
    'Watch free Bangla movies, Hindi cinema, Bangla natok, and drama online in HD. Enjoy offline games and seamless media downloads with Play Nexa.',
  keywords: [
    'bangla movie watch online free',
    'bangla natok 2024',
    'hindi dubbed movies',
    'play nexa',
    'free movies and natok',
    'bangla drama online',
  ],
  openGraph: {
    title: 'Play Nexa — Free Movies, Bangla Natok & Games',
    description: 'Watch free Bangla movies, natok, drama, and web series online.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/',
  },
}

export default function HomePage() {
  return <HomeFeedClient />
}
