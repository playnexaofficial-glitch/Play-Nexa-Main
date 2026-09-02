import type { Metadata } from 'next'
import SearchPageClient from '@/components/search/SearchPageClient'

export const metadata: Metadata = {
  title: 'Search — Movies, Natok, Songs & Games',
  description:
    'Search movies, natok, songs, web series, ' +
    'games on Play Nexa. Find any Bangla or ' +
    'Hindi content instantly.',
}

export default function SearchPage() {
  return <SearchPageClient />
}
