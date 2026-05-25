/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Next.js instrumentation hook (runs instrumentation.ts on server start)
  instrumentationHook: true,

  // Your existing settings
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Required for Electron desktop packaging — creates a self-contained server bundle
  output: 'standalone',
  
  // Additional production settings for error handling
  reactStrictMode: true,
  
  // Custom webpack config to handle production builds
  webpack: (config, { dev, isServer }) => {
    // In production, disable source maps for security
    if (!dev) {
      config.devtool = false
    }
    
    return config
  },

  // Environment variables
  env: {
    // Hide detailed error information in production
    NEXT_PUBLIC_HIDE_ERRORS: process.env.NODE_ENV === 'production' ? 'true' : 'false',
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

export default nextConfig