/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Capacitor APK
  // This bundles the app inside the APK
  output: 'export',

  // Required for static export
  trailingSlash: true,

  // Images: unoptimized for static export
  // (Next.js image optimization needs a server)
  images: {
    unoptimized: true,
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
