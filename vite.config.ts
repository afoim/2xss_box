import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // 显式 host：Vite 默认只监听 IPv6 回环，Windows 上 `localhost` 解析到
    // 127.0.0.1 时会连不上（Playwright/curl 直接 ECONNREFUSED）
    host: true,
    port: 5180,
  },
  build: {
    // 纯 CSR：产物就是一个 index.html + 一堆哈希资源，扔任何静态托管都能跑
    outDir: 'dist',
    sourcemap: false,
  },
});
