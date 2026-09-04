import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import MovieWatchClient from '@/components/movies/MovieWatchClient'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
const supabase = createClient(
  supabaseUrl, supabaseKey)

const getValidAppUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    try {
      new URL(envUrl)
      return envUrl
    } catch {}
  }
  return 'https://play-nexa.vercel.app'
}

interface Props {
  params: Promise<{ id: string }>
}

export const dynamicParams = true

export async function generateStaticParams() {
  return []
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabase
    .from('movies')
    .select(
      'title, channel_name, thumbnail, genre, ' +
      'content_type, duration_seconds, view_count'
    )
    .eq('id', id)
    .single()

  const movie = data as any
  if (!movie) {
    return {
      title: 'Watch Movie Online Free — Play Nexa',
      description:
        'Watch movies and natok free on Play Nexa',
    }
  }

  const isNatok =
    movie.content_type === 'natok'
  const genreStr =
    movie.genre?.join(', ') || ''
  const baseTitle =
    isNatok
      ? `${movie.title} — Watch Bangla Natok Online Free`
      : `${movie.title} — Watch Full Movie Online Free`

  const desc =
    `Watch ${movie.title} by ${movie.channel_name} ` +
    `online free in HD on Play Nexa. ` +
    (genreStr ? `Genre: ${genreStr}. ` : '') +
    `No registration required. Stream now.`

  const appUrl = getValidAppUrl()

  return {
    title: baseTitle,
    description: desc,
    keywords: [
      movie.title,
      `${movie.title} watch online`,
      `${movie.title} full movie`,
      `${movie.title} free`,
      movie.channel_name,
      isNatok ? 'bangla natok' : 'bangla movie',
      isNatok ? 'natok online free' : 'movie online free',
      ...(movie.genre || []),
      'play nexa movie',
    ],
    openGraph: {
      title: baseTitle,
      description: desc,
      type: 'video.movie',
      url: `${appUrl}/movies/${id}`,
      images: [
        {
          url:
            movie.thumbnail ||
            `${appUrl}/og-image.png`,
          width: 1280,
          height: 720,
          alt: movie.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: baseTitle,
      description: desc,
      images: [
        movie.thumbnail ||
        `${appUrl}/og-image.png`,
      ],
    },
    alternates: {
      canonical: `${appUrl}/movies/${id}`,
    },
  }
}

export default async function MovieWatchPage(
  { params }: Props
) {
  const { id } = await params
  const { data } = await supabase
    .from('movies')
    .select('*')
    .eq('id', id)
    .single()

  const movie = data as any
  const appUrl = getValidAppUrl()

  const movieSchema = movie ? {
    '@context': 'https://schema.org',
    '@type':
      movie.content_type === 'natok'
        ? 'TVEpisode'
        : 'Movie',
    name: movie.title,
    description:
      `Watch ${movie.title} online free ` +
      `on Play Nexa`,
    image: movie.thumbnail,
    url: `${appUrl}/movies/${id}`,
    genre: movie.genre || [],
    author: {
      '@type': 'Organization',
      name: movie.channel_name,
    },
    ...(movie.duration_seconds ? {
      duration:
        `PT${Math.floor(movie.duration_seconds / 60)}M` +
        `${movie.duration_seconds % 60}S`
    } : {}),
    potentialAction: {
      '@type': 'WatchAction',
      target: `${appUrl}/movies/${id}`,
    },
  } : null

  return (
    <>
      {movieSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(movieSchema),
          }}
        />
      )}
      <MovieWatchClient id={id} initialMovie={movie} />
    </>
  )
}
