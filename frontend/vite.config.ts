import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  // 仅 dev：从 .env.local 读 ADMIN_TOKEN，由 proxy 注入 x-admin-token 到测试后端 :8001。
  // token 只存在于 dev server 进程内，不进前端 bundle；生产由 nginx 注入或走 IP 白名单。
  const env = loadEnv(mode, __dirname, '')
  const proxyHeaders = env.ADMIN_TOKEN ? { 'x-admin-token': env.ADMIN_TOKEN } : {}

  return {
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    // dev server：代理 /v1 与 /uploads 到独立测试后端（:8001），生产由 nginx 反代
    server: {
      host: true,
      proxy: {
        '/v1': { target: 'http://localhost:8001', changeOrigin: true, headers: proxyHeaders },
        '/uploads': { target: 'http://localhost:8001', changeOrigin: true, headers: proxyHeaders },
      },
    },
  }
})
