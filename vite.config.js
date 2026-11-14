import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const paket = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __UYGULAMA_SURUMU__: JSON.stringify(paket.version),
  },
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    testTimeout: 60_000,
  },
})
