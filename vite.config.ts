import path from 'node:path'
import process from 'node:process'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE_URL ?? '/api/v1'
  const proxyTarget = env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3000'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5180,
      host: '0.0.0.0',
      // dev 时本地直连后端：避免 CORS 困扰，前端走 /api 路径，由 vite 转发到后端 3000
      proxy: apiBase.startsWith('/')
        ? {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    build: {
      target: 'es2022',
      sourcemap: false,
      // 输出文件用 hash 命名，配合 nginx 强缓存
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  }
})
