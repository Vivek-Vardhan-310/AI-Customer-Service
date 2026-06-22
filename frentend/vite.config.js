import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'onnxruntime-web/wasm': fileURLToPath(new URL('./src/ort-loader.js', import.meta.url)),
      'onnxruntime-web': fileURLToPath(new URL('./src/ort-loader.js', import.meta.url))
    }
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  }
})

