import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/onnxruntime-web/dist/*.wasm',
          dest: 'assets'
        },
        {
          src: 'node_modules/onnxruntime-web/dist/*.mjs',
          dest: 'assets'
        },
        {
          src: 'node_modules/onnxruntime-web/dist/*.onnx',
          dest: 'assets'
        }
      ]
    })
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  }
})
