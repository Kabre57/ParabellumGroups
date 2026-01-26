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
    unoptimized: true, // Désactive l'optimisation d'images si vous avez des problèmes
  },
  
  // Configuration des headers pour les polices
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Accept',
            value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        ],
      },
    ];
  },
  
  // Configuration TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ESLint (déplacé vers la configuration ESLint séparée)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Configuration pour éviter les problèmes avec Turbopack
  experimental: {
    turbo: {
      root: 'C:\\Users\\Theo\\Documents\\GitHub\\ParabellumGroups\\frontend',
      resolveAlias: {
        // Assurez-vous que les alias sont corrects
        '@/components/*': ['./src/components/*'],
        '@/shared/*': ['./src/shared/*'],
        '@/app/*': ['./app/*'],
      },
    },
  },
}

// Ajoutez cette vérification pour le problème de lockfile
if (process.env.NODE_ENV === 'development') {
  console.log('Mode développement avec Turbopack');
}

module.exports = nextConfig