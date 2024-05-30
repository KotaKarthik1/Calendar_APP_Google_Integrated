import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {  // <-- Enclose port configuration within the server object
    port: 3000
  }
})
