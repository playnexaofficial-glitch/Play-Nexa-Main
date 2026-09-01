import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import InstallBanner from "@/components/InstallBanner";
import { MusicProvider } from "@/context/MusicContext";
import GlobalMiniPlayer from "@/components/GlobalMiniPlayer";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import SystemWidgets from "@/components/SystemWidgets";


const getValidAppUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && (envUrl.startsWith("http://") || envUrl.startsWith("https://"))) {
    try {
      new URL(envUrl);
      return envUrl;
    } catch {}
  }
  return "https://play-nexa.vercel.app";
};

const APP_URL = getValidAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default:
      'Play Nexa — Free Movies, Natok, Music' +
      ' & Games Online',
    template: '%s | Play Nexa',
  },

  description:
    'Play Nexa — Watch free Bangla movies, ' +
    'Hindi movies, Bangla natok, web series ' +
    'online. Listen to free music, play ' +
    'online games. Smart downloader for ' +
    'YouTube, TikTok, Instagram, Facebook. ' +
    'No subscription, 100% free entertainment.',

  keywords: [
    // App name variations
    'play nexa', 'playnexa', 'play nexa app',
    'play nexa bd', 'play nexa bangladesh',

    // Bangla movie keywords
    'bangla movie', 'bangla movie 2024',
    'bangla movie free', 'bangla full movie',
    'bengali movie online', 'natok online',
    'bangla natok', 'bangla natok 2024',
    'bangla web series', 'bangla telefilm',
    'eid natok', 'bangla drama free',
    'bangla movie watch online free',
    'bangladesh movie', 'bongo movies free',

    // Hindi movie keywords
    'hindi movie free', 'hindi dubbed movie',
    'hindi movie online', 'bollywood free',
    'hindi movie watch online',

    // Music keywords
    'bangla song', 'bangla music free',
    'hindi song online', 'free music streaming',
    'bangla song download', 'new bangla song',
    'romantic bangla song', 'lofi bangla',
    'hindi english mashup',

    // Download keywords
    'youtube downloader', 'video downloader',
    'savefrom alternative', 'vidmate alternative',
    'y2mate alternative', 'tiktok downloader',
    'instagram downloader', 'facebook downloader',
    'free video downloader online',
    'mp3 downloader free', 'mp4 downloader',

    // Game keywords
    'free online games', 'mobile games free',
    'bangla game', 'games play free',

    // Feature keywords
    'free entertainment app',
    'stream movies free bangladesh',
    'watch natok online free',
    'online music player free',
    'video player online',
  ],

  authors: [
    { name: 'Play Nexa Team' },
    { name: 'Munna', url: APP_URL },
  ],

  creator: 'Play Nexa',
  publisher: 'Play Nexa',

  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['bn_BD'],
    url: APP_URL,
    siteName: 'Play Nexa',
    title:
      'Play Nexa — Free Movies, Natok, ' +
      'Music & Games',
    description:
      'Watch Bangla movies, natok, Hindi ' +
      'movies free. Listen to music, play ' +
      'games, download videos. 100% free!',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Play Nexa — Free Entertainment Hub',
        type: 'image/png',
      }
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title:
      'Play Nexa — Free Movies, Music & Games',
    description:
      'Watch free Bangla movies, natok, ' +
      'listen to music, play games online.',
    images: ['/og-image.png'],
    creator: '@playnexa',
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  verification: {
    google: 'dtXzEN6HswwcZBy6woxiEMM9LJ8d27GI4jCLHFdEpTk',
  },

  alternates: {
    canonical: APP_URL,
    languages: {
      'en-US': APP_URL,
      'bn-BD': APP_URL,
    },
  },

  manifest: '/manifest.json',

  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
    shortcut: '/icon-192.png',
  },

  category: 'entertainment',
};

const globalJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${APP_URL}/#webapp`,
      'name': 'Play Nexa',
      'url': APP_URL,
      'description':
        'Free movies, natok, music streaming ' +
        'and video downloader app. Watch Bangla ' +
        'and Hindi content online for free.',
      'applicationCategory':
        'EntertainmentApplication',
      'operatingSystem': 'Android, Web',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD',
      },
      'featureList': [
        'Free Bangla Movies Online',
        'Free Bangla Natok Online',
        'Free Hindi Movies',
        'Free Music Streaming',
        'Online Games',
        'Video Downloader',
        'YouTube Downloader',
        'TikTok Downloader',
        'Instagram Downloader',
        'Offline Music Player',
        'Offline Video Player',
        'No Subscription Required',
      ],
      'screenshot': `${APP_URL}/og-image.png`,
      'logo': `${APP_URL}/icon-512.png`,
    },
    {
      '@type': 'Organization',
      '@id': `${APP_URL}/#org`,
      'name': 'Play Nexa',
      'url': APP_URL,
      'logo': {
        '@type': 'ImageObject',
        'url': `${APP_URL}/icon-512.png`,
        'width': 512,
        'height': 512,
      },
      'contactPoint': {
        '@type': 'ContactPoint',
        'email': 'playnexaofficial@gmail.com',
        'contactType': 'customer service',
        'availableLanguage': ['English', 'Bengali'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${APP_URL}/#website`,
      'url': APP_URL,
      'name': 'Play Nexa',
      'description':
        'Free entertainment platform for ' +
        'Bangla and Hindi content',
      'potentialAction': {
        '@type': 'SearchAction',
        'target': {
          '@type': 'EntryPoint',
          'urlTemplate':
            `${APP_URL}/search?q={search_term_string}`,
        },
        'query-input':
          'required name=search_term_string',
      },
    },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#CC0000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#CC0000" />
        <meta name="msapplication-TileColor" content="#CC0000" />
        <meta name="msapplication-TileImage" content="/icons/icon-512.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="google-site-verification" content="dtXzEN6HswwcZBy6woxiEMM9LJ8d27GI4jCLHFdEpTk" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(globalJsonLd),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var _k = 'pn_settings';
                if (!localStorage.getItem(_k)) {
                  var _old = localStorage.getItem('grovix_settings');
                  if (_old) { localStorage.setItem(_k, _old); localStorage.removeItem('grovix_settings'); }
                }
                var s = JSON.parse(localStorage.getItem(_k) || '{}');
                var theme = s.theme || 'dark';
                var themes = {
                  dark:   { bg: '#070B14', accent: '#7C5CFF' },
                  amoled: { bg: '#000000', accent: '#7C5CFF' },
                  neon:   { bg: '#070B14', accent: '#00FF88' }
                };
                var t = themes[theme] || themes.dark;
                document.documentElement.style
                  .setProperty('--accent', t.accent);
                document.body.style.backgroundColor = t.bg;
              } catch(e) {}
            `
          }}
        />
      </head>
      <body
        className={`antialiased bg-pn-bg text-white min-h-screen`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        suppressHydrationWarning
      >
        <MusicProvider>
          <SystemWidgets />
          <main className="min-h-screen">
            {children}
          </main>
          <BottomNav />
          <InstallBanner />
          <GlobalMiniPlayer />
          <SpeedInsights />
          <Analytics />
          <ServiceWorkerRegistrar />
        </MusicProvider>
      </body>
      </html>
  );
}
