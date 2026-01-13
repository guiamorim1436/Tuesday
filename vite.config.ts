
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to resolve TS error in environments where process type doesn't include cwd()
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: '/', 
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'global': 'window',
      // Garante compatibilidade para libs que ainda buscam o objeto process
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    server: {
      host: true,
      port: 3000,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
          },
        },
      }
    }
  };
});
