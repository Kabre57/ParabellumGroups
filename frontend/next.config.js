// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  env: {
    API_GATEWAY_URL: process.env.API_GATEWAY_URL || 'http://localhost:3001',
  },

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Accept',
            value:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        ],
      },
    ];
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // Fix monorepo / multiple lockfiles
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
