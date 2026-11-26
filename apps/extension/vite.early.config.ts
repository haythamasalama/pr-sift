import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: { entry: 'src/content/early.ts', formats: ['iife'], name: 'PrSiftEarly', fileName: () => 'early.js' },
  },
})
