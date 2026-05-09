import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Exclude onnxruntime-web from pre-bundling to avoid WASM issues
    exclude: ['onnxruntime-web'],
  },
})


