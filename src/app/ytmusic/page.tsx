import type { Metadata } from 'next'
import YTMusicPageClient from '@/components/ytmusic/YTMusicPageClient'

export const metadata: Metadata = {
  title:
    'Free Music — Bangla Songs, Hindi Songs ' +
    'Online Streaming',
  description:
    'Listen to free Bangla songs, Hindi songs, ' +
    'romantic songs, lofi music, remix, mashup ' +
    'online. No subscription needed. Stream ' +
    'unlimited music free. Audio and video mode.',
  keywords: [
    'bangla song free',
    'hindi song online',
    'free music streaming',
    'bangla romantic song',
    'lofi bangla music',
    'hindi english mashup',
    'new bangla song 2024',
    'bangla music online',
    'audio song free',
    'youtube music alternative',
    'free music player online',
    'krash music mashup',
    'sandeep music slowed',
    'reverb songs free',
    'bollywood song free',
    'bangla folk song',
    'rabindra sangeet free',
  ],
  openGraph: {
    title: 'Free Music Online | Play Nexa',
    description:
      'Stream Bangla and Hindi music free.',
    images: ['/og-image.png'],
  },
}

export default function YTMusicPage() {
  return <YTMusicPageClient />
}
