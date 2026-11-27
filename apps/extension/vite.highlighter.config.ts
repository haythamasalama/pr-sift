import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: { entry: 'src/features/diff/highlighterEntry.ts', formats: ['iife'], name: 'PrSiftHighlighter', fileName: () => 'highlighter.js' },
  },
})
