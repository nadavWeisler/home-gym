import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local `npm run dev` stays at /. Production Pages is served at /home-gym/.
export default defineConfig(({ command }) => ({
  root: 'app',
  plugins: [react()],
  base: command === 'serve' ? '/' : '/home-gym/',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
}))
