import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'DEV_')
  const target = mode === 'vps'
    ? env.DEV_BACKEND_URL
    : env.DEV_LOCAL_BACKEND_URL || 'http://127.0.0.1:8080'
  const port = Number(env.DEV_PORT) || (mode === 'vps' ? 5174 : 5173)
  if (!target) {
    throw new Error('Set DEV_BACKEND_URL in frontend-react/.env.vps.local to use dev:vps')
  }

  return {
    plugins: [react()],
    server: {
      host: env.DEV_HOST || '0.0.0.0',
      port,
      strictPort: true,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/ws': { target, changeOrigin: true, ws: true },
      },
    },
  }
})

