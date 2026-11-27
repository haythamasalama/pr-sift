import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const extension = fileURLToPath(new URL('../extension/src', import.meta.url))
const renderer = fileURLToPath(new URL('./src/renderer', import.meta.url))
const shared = fileURLToPath(new URL('./src/shared', import.meta.url))

export default defineConfig({
  main: {
    resolve: { alias: { '#shared': shared } },
  },
  preload: {
    resolve: { alias: { '#shared': shared } },
    // A sandboxed preload can only be a CommonJS script.
    build: { rollupOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } } },
  },
  renderer: {
    plugins: [vue(), tailwindcss()],
    resolve: { alias: { '@': extension, '~': renderer, '#shared': shared } },
    define: {
      __VUE_OPTIONS_API__: false,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
  },
})
