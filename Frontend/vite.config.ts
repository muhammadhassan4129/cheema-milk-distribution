import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        // Frontend dev server se backend API calls proxy karo
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor libraries alag chunk mein
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-charts': ['recharts'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable'],
            'vendor-motion': ['motion'],
            // Services alag chunk
            'services': [
              './src/services/api.ts',
              './src/services/offlineSync.ts',
              './src/services/ledgerSync.ts',
            ],
            // Contexts alag chunk
            'contexts': [
              './src/contexts/AuthContext.tsx',
              './src/contexts/UserContext.tsx',
              './src/contexts/VehicleContext.tsx',
              './src/contexts/RouteContext.tsx',
              './src/contexts/RouteCollectionContext.tsx',
              './src/contexts/MilkTransactionContext.tsx',
              './src/contexts/DispatchContext.tsx',
              './src/contexts/AdvanceContext.tsx',
              './src/contexts/AccountContext.tsx',
              './src/contexts/LabContext.tsx',
              './src/contexts/ThemeContext.tsx',
              './src/contexts/TransactionContext.tsx',
            ],
          },
        },
      },
    },
  };
});
