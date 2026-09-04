'use client'

import Link from 'next/link'
import { Movie, ChannelDisplay } from '@/components/movies/MovieCard'

interface MediaCardProps {
  item: Movie
  onPress?: () => void
  channelDisplay?: ChannelDisplay
  showTypeBadge?: boolean
  customWidthClass?: string
}

export default function MediaCard({
  item,
  onPress,
  channelDisplay,
  showTypeBadge = false,
  customWidthClass = 'w-[200px] sm:w-[230px]',
}: MediaCardProps) {
  const channelName =
    channelDisplay?.display_name ||
    channelDisplay?.name ||
    item.channel_name ||
    (item as any).channel ||
    'Play Nexa'

  const contentType = (item as any).content_type

  return (
    <Link
      href={`/movies/${item.id}`}
      onClick={onPress}
      className={`group flex-shrink-0 text-left block active:scale-[0.97] transition-transform duration-150 ${customWidthClass}`}
      style={{ textDecoration: 'none' }}
    >
      {/* 16:9 Thumbnail Container */}
      <div className="relative w-full aspect-video bg-[#161626] rounded-xl sm:rounded-2xl overflow-hidden border border-[#24243B]/60 shadow-sm mb-2">
        <img
          src={item.thumbnail}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Badges Overlay */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10 pointer-events-none">
          {showTypeBadge && contentType && (
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider leading-none shadow-sm ${
                contentType === 'natok'
                  ? 'bg-[#06B6D4] text-black font-extrabold'
                  : 'bg-[#7C3AED] text-white'
              }`}
            >
              {contentType === 'natok' ? 'Natok' : 'Movie'}
            </span>
          )}

          {item.isNew && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-black bg-white leading-none shadow-sm">
              New
            </span>
          )}

          {item.badge && !item.isNew && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-[#7C3AED] leading-none shadow-sm">
              {item.badge}
            </span>
          )}
        </div>
      </div>

      {/* Typography & Metadata */}
      <div className="px-0.5">
        <p className="text-white text-xs sm:text-sm font-semibold line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors">
          {item.title}
        </p>
        <p className="text-[#8E8EA0] text-[11px] mt-1 truncate font-normal">
          {channelName}
        </p>
      </div>
    </Link>
  )
}
