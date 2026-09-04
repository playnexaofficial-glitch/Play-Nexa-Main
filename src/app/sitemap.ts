import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import platformsData from '@/data/platforms.json'

export const revalidate = 3600

const getBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    try {
      const parsed = new URL(envUrl)
      return parsed.origin.replace(/\/+$/, '')
    } catch {
      // ignore invalid url
    }
  }
  return 'https://play-nexa.vercel.app'
}

const BASE_URL = getBaseUrl()

interface DynamicMovieItem {
  id: string
  created_at?: string
  updated_at?: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // 1. Core static routes with optimized SEO priorities and change frequencies
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/movies`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/shorts`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/games`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/ott`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/download`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/platforms`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/help`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/security`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]

  // 2. Dynamic OTT Platform routes from local dataset
  const platformRoutes: MetadataRoute.Sitemap = []
  if (Array.isArray(platformsData)) {
    for (const platform of platformsData) {
      if (platform && platform.id) {
        platformRoutes.push({
          url: `${BASE_URL}/platforms/${platform.id}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }
    }
  }

  // 3. Dynamic Movies and Bangla Natok routes from Supabase database
  const movieRoutes: MetadataRoute.Sitemap = []
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await supabase
        .from('movies')
        .select('id, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(2000)

      if (!error && Array.isArray(data)) {
        for (const item of data as DynamicMovieItem[]) {
          if (item?.id) {
            const rawDate = item.updated_at || item.created_at
            const lastModDate = rawDate ? new Date(rawDate) : now
            const validDate = isNaN(lastModDate.getTime()) ? now : lastModDate

            movieRoutes.push({
              url: `${BASE_URL}/movies/${item.id}`,
              lastModified: validDate,
              changeFrequency: 'weekly',
              priority: 0.8,
            })
          }
        }
      }
    }
  } catch {
    // Fallback gracefully without breaking sitemap compilation
  }

  // 4. Combine and deduplicate URLs by exact URL string
  const urlMap = new Map<string, MetadataRoute.Sitemap[number]>()
  for (const entry of [...staticRoutes, ...platformRoutes, ...movieRoutes]) {
    urlMap.set(entry.url, entry)
  }

  return Array.from(urlMap.values())
}
