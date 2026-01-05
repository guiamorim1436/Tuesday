import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react()],
    base: '/',   // ESSENCIAL no Vercel
    define: {
      __APP_ENV__: JSON.stringify(env)
    },
    server: {
      host: true,
      port: 3000
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false
      // NÃO externalize React
    }
  };
});
