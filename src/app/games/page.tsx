import type { Metadata } from 'next'
import GameHub from '@/components/games/GameHub'

export const metadata: Metadata = {
  title:
    'Free Online Games — Play Without Download',
  description:
    'Play free online games, offline games, ' +
    'action games, puzzle games, racing games, ' +
    'arcade games on Play Nexa. No download ' +
    'needed. Browser games, mobile games free.',
  keywords: [
    'free online games',
    'play games free',
    'browser games free',
    'mobile games online',
    'offline games free',
    'action games free',
    'puzzle games online',
    'racing games free',
    'arcade games free',
    'bangla games',
  ],
  openGraph: {
    title: 'Free Games Online | Play Nexa',
    description: 'Play free online games.',
    images: ['/og-image.png'],
  },
}

export default function GamesPage() {
  return <GameHub />
}
