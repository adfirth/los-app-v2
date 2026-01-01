import { defineConfig } from 'vite';

export default defineConfig({
  // Root directory is the project root since index.html is there
  root: '.',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  // Ensure .env files are loaded
  envDir: '.'
});
