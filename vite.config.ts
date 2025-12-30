
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo (development/production)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // 'base: ./' garante que o app funcione mesmo se não estiver na raiz do domínio
    base: './', 
    define: {
      // Isso corrige o erro "process is not defined" que causa a tela branca
      'process.env': env
    },
    server: {
      host: true,
      port: 3000,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false, // Desativa sourcemaps em produção para economizar espaço
    }
  };
});
