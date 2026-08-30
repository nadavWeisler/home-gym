import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site lives at /Home-gym/. Local `npm run dev` stays at /.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
})
