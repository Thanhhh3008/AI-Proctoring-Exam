import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true, // Cho phép tất cả các host (kể cả ngrok, localtunnel)
    proxy: {
      '/proctoring': {
        target: 'http://localhost:3000',
        ws: true
      },
      // Thêm proxy cho các API chung để chắc chắn an toàn (nếu cần)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    // Exclude onnxruntime-web from pre-bundling to avoid WASM issues
    exclude: ['onnxruntime-web'],
  },
})


