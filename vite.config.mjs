import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  if (mode === 'official') {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    if (env.VITE_SUPABASE_URL !== 'https://grfmiuopojbxxbdymqax.supabase.co' || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('Modo oficial: confira a URL do projeto e a chave pública em .env.official.local. Inicialização cancelada para evitar conexão ao banco errado.');
    }
  }
  return {
  base: '/exclusive/',
  build: { rollupOptions: { input: { main: 'index.html', review: 'revisao-area-social.html', laboratory: 'laboratorio-imagens.html' } } }
  };
});
