import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // use Dart Sass's modern API (removes legacy-js-api warnings)
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build', // keep same output folder name as CRA (change to 'dist' if you prefer Vite's default)
  },
});
