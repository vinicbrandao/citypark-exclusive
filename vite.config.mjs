import { defineConfig } from 'vite';

export default defineConfig({
  base: '/exclusive/',
  build: { rollupOptions: { input: { main: 'index.html', review: 'revisao-area-social.html', laboratory: 'laboratorio-imagens.html' } } }
});
