import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local `npm run dev` stays at /. Branch Pages serves the committed build at /home-gym/docs/.
export default defineConfig(({ command }) => ({
  root: 'app',
  plugins: [react()],
  base: process.env.BASE_PATH || (command === 'serve' ? '/' : '/home-gym/docs/'),
  publicDir: 'public',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
}))
