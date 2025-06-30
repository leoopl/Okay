import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

// Production security headers
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fcm.googleapis.com https://fcmregistrations.googleapis.com; worker-src 'self' blob:; manifest-src 'self';",
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

// Development security headers (less strict)
const devSecurityHeaders = [
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
];

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  transpilePackages: ['next-mdx-remote'],

  // Enable React strict mode for better error detection
  reactStrictMode: true,

  // Change the body size limit for server actions
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },

  // Optimize images for PWA
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // Enable compression
  compress: true,

  // Generate build ID for better caching
  generateBuildId: async () => {
    // Use git commit hash or timestamp
    return process.env.BUILD_ID || Date.now().toString();
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: process.env.NODE_ENV === 'production' ? securityHeaders : devSecurityHeaders,
      },
      // Service Worker headers
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
      // Manifest headers
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      // Offline page
      {
        source: '/offline',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Webpack configuration for PWA optimization
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      // Optimize chunks for better caching
      config.optimization = {
        ...config.optimization,
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Libraries chunk
            lib: {
              test(module: any) {
                return (
                  module.size() > 160000 &&
                  /node_modules[/\\]/.test(module.nameForCondition?.() || '')
                );
              },
              name(module: any) {
                const packageName = module.context?.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/,
                )?.[1];
                return `lib-${packageName?.replace('@', '').replace('/', '-') || 'unknown'}`;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Commons chunk
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Shared chunk
            shared: {
              name: 'shared',
              priority: 10,
              test: /[\\/]src[\\/]components[\\/]|[\\/]src[\\/]lib[\\/]/,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Add bundle analyzer in development
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './analyze.html',
            openAnalyzer: true,
          }),
        );
      }
    }
    return config;
  },
};

// Serwist configuration with optimal settings for Okay mental health PWA
const withSerwist = withSerwistInit({
  // Service Worker configuration
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',

  // Disable in development for easier debugging
  disable: process.env.NODE_ENV === 'development',

  // Caching configuration
  cacheOnNavigation: true,
  reloadOnOnline: true,

  // Scope and registration
  scope: '/',
  swUrl: '/sw.js',
  register: true,

  // Files to precache
  additionalPrecacheEntries: [
    // Critical offline pages
    { url: '/offline', revision: Date.now().toString() },
    { url: '/breathing', revision: Date.now().toString() },

    // App icons
    { url: '/favicon/favicon.ico', revision: '1' },
    { url: '/favicon/web-app-manifest-192x192.png', revision: '1' },
    { url: '/favicon/web-app-manifest-512x512.png', revision: '1' },

    // Critical fonts
    {
      url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      revision: '1',
    },
  ],

  // Exclude patterns
  exclude: [
    // Development files
    /\.map$/,
    /^manifest.*\.js$/,

    // Media files (too large for precaching)
    /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,

    // Dynamic API routes
    /^api\//,
    /^_next\/data\//,

    // Large images (cache on demand instead)
    /\.(jpg|jpeg|png|gif|webp|avif)$/i,
  ],

  // Include patterns - only precache critical assets
  include: [
    // JavaScript and CSS
    /\.(?:js|css)$/,

    // Critical pages
    /^\/(offline|breathing|journal|medication)(\/index)?\.html$/,

    // App shell assets
    /^\/(_next\/static|static)\/.*/,
  ],

  // Maximum file size to cache (2MB for critical assets)
  maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,

  // URL modifications
  modifyURLPrefix: {
    '': '/',
  },

  // Don't cache bust Next.js assets (they have hashes)
  dontCacheBustURLsMatching: /^\/_next\/static\/.*/,

  // Manifest transforms for additional processing
  manifestTransforms: [
    (originalManifest) => {
      const manifest = originalManifest.map((entry) => {
        // Add cache headers for specific file types
        if (typeof entry !== 'string' && entry.url.match(/\.(js|css)$/)) {
          return {
            ...entry,
            // Add integrity for security
            integrity: entry.integrity || undefined,
          };
        }
        return entry;
      });

      // Sort by size to prioritize smaller files
      manifest.sort((a, b) => {
        const sizeA = (typeof a !== 'string' && a.size) || 0;
        const sizeB = (typeof b !== 'string' && b.size) || 0;
        return sizeA - sizeB;
      });

      return { manifest };
    },
  ],

  // Compilation plugins
  webpackCompilationPlugins: [],
});

export default withSerwist(nextConfig);
