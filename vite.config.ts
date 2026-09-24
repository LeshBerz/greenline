/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so the build works on GitHub Pages and any static host.
  base: './',
  test: {
    globals: true,
    environment: 'jsdom',
    passWithNoTests: true,
  },
})
