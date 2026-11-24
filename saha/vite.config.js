// Paratoner Saha (Android) ön yüzü. Kök bu klasördür; masaüstüyle ortak kod ../src altından gelir.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ayar = JSON.parse(readFileSync(new URL('./src-tauri/tauri.conf.json', import.meta.url), 'utf8'))
// `tauri android dev` telefona/emülatöre geliştirme sunucusunun adresini bu değişkenle verir.
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  define: {
    __SAHA_SURUMU__: JSON.stringify(ayar.version),
  },
  clearScreen: false,
  server: {
    port: 5310,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 5311 } : undefined,
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
})
