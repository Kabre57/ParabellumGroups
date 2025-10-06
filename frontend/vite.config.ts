import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { splitVendorChunkPlugin } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      splitVendorChunkPlugin()
    ],
    optimizeDeps: {
      exclude: ["lucide-react"],
    },
    define: {
      "__REACT_QUERY_STATE_TRANSITION__": "true",
      "__REACT_ROUTER_FUTURE_FLAGS__": JSON.stringify({
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }),
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('@mui')) {
                return 'mui-vendor';
              }
              if (id.includes('date-fns') || id.includes('axios') || id.includes('lodash')) {
                return 'utils-vendor';
              }
              if (id.includes('recharts') || id.includes('chart.js')) {
                return 'charts-vendor';
              }
              if (id.includes('lucide-react')) {
                return 'icons-vendor';
              }
              return 'vendor';
            }
          },
        },
      },
    },
    server: {
      port: env.APP_PORT ? Number(env.APP_PORT) : 5174,
      headers: {
        "Content-Security-Policy": "default-src 'self' blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:* http://localhost:3001; font-src 'self' data:; img-src 'self' data: blob:;"
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };

});