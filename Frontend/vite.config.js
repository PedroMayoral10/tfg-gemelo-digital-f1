import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

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