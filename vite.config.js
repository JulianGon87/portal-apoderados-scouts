// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // O @vitejs/plugin-vue, etc.
import tailwindcss from '@tailwindcss/vite' // 1. Importar el plugin

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0', // Permite conexiones desde la red local
    port: 5173,
  },
})