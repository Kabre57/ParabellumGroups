// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: false,

  env: {
    API_GATEWAY_URL: process.env.API_GATEWAY_URL || 'http://localhost:3001',
  },

  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }

    const gatewayUrl = (
      process.env.API_GATEWAY_URL ||
      process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
      'http://localhost:3001'
    ).replace(/\/api\/?$/, '');

    return [
      {
        source: '/api/:path*',
        destination: `${gatewayUrl}/api/:path*`,
      },
    ];
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

  // Ajoutez ceci pour le problème de lockfile
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;

