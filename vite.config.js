import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 部署到GitHub Pages需要设置base路径（替换为你的仓库名称）
  base: '/'
})