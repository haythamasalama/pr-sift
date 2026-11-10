import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.SITE_BASE ?? '/pr-sift/',
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: { en: resolve(import.meta.dirname, 'index.html'), ar: resolve(import.meta.dirname, 'ar/index.html') },
    },
  },
})
