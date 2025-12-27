import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/location': {
        target: 'http://localhost:3000', // Apunta a tu backend Express
        changeOrigin: true,
        secure: false,
      }
    }
  }
})