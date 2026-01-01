/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['js/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
});
