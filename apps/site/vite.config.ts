import { readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const root = resolve(import.meta.dirname, 'pages')

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? htmlFiles(path) : name.endsWith('.html') ? [path] : []
  })
}

export default defineConfig({
  root,
  base: process.env.SITE_BASE ?? '/pr-sift/',
  publicDir: resolve(import.meta.dirname, 'public'),
  plugins: [tailwindcss()],
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(htmlFiles(root).map((file) => [relative(root, file).replace(/\.html$/, ''), file])),
    },
  },
})
