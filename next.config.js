/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https',
        hostname: 'i.ytimg.com' },
      { protocol: 'https',
        hostname: 'unavatar.io' },
      { protocol: 'https',
        hostname: '*.supabase.co' },
      { protocol: 'https',
        hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https',
        hostname: 'yt3.ggpht.com' },
    ],
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  poweredByHeader: false,
  compress: true,
}

module.exports = nextConfig
