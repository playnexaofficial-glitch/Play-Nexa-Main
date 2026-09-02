import type { Metadata } from 'next'
import DownloadHome from '@/components/download/DownloadHome'

export const metadata: Metadata = {
  title:
    'Free Video Downloader — YouTube, TikTok, ' +
    'Instagram, Facebook',
  description:
    'Download videos from YouTube, TikTok, ' +
    'Instagram, Facebook, Twitter, Dailymotion, ' +
    'Vimeo and 20+ platforms free. Download MP3, ' +
    'MP4, HD quality. Best Savefrom alternative, ' +
    'Y2Mate alternative, Vidmate alternative.',
  keywords: [
    'youtube video downloader free',
    'tiktok downloader without watermark',
    'instagram video downloader',
    'facebook video downloader',
    'savefrom alternative',
    'y2mate alternative',
    'vidmate alternative',
    'snaptik alternative',
    'youtube mp3 downloader',
    'youtube mp4 downloader',
    'twitter video downloader',
    'dailymotion downloader',
    'vimeo downloader',
    'pinterest video downloader',
    'video downloader online free',
    'all video downloader',
    'hd video downloader free',
    'download youtube video online',
    'mp3 converter free',
  ],
  openGraph: {
    title:
      'Free Video Downloader | Play Nexa',
    description:
      'Download from YouTube, TikTok, ' +
      'Instagram and 20+ platforms free.',
    images: ['/og-image.png'],
  },
}

export default function DownloadPage() {
  return (
    <>
      <DownloadHome />

      {/* SEO Content — helps search ranking */}
      <div className="sr-only" aria-hidden="false">
        <h2>Free Video Downloader Features</h2>
        <p>
          Play Nexa Smart Downloader supports
          downloading from YouTube, TikTok,
          Instagram, Facebook, Twitter, Dailymotion,
          Vimeo, Pinterest, Snapchat, LinkedIn,
          Reddit, Tumblr, Bilibili, Twitch,
          SoundCloud, Mixcloud, Bandcamp,
          and 20+ more platforms.
        </p>
        <p>
          Download YouTube videos as MP4 or MP3.
          Download TikTok videos without watermark.
          Download Instagram Reels and Stories.
          Download Facebook videos and Reels.
          Best free alternative to Savefrom,
          Y2Mate, Vidmate, Snaptik, SSSTikTok,
          SaveTube, VideoProc, 4K Video Downloader.
        </p>
        <h3>Supported Platforms</h3>
        <ul>
          <li>YouTube Downloader</li>
          <li>TikTok Downloader</li>
          <li>Instagram Downloader</li>
          <li>Facebook Downloader</li>
          <li>Twitter/X Downloader</li>
          <li>Dailymotion Downloader</li>
          <li>Vimeo Downloader</li>
          <li>Pinterest Downloader</li>
        </ul>
      </div>
    </>
  )
}
