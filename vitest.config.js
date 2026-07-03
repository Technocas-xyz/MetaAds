import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
    conditions: ['development', 'browser'],
  },
  define: {
    'process.env.NODE_ENV': '"test"',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        'src/__tests__/**',
        'e2e/**',
        '**/*.config.*',
        'src/api/_fixtures/**',
      ],
    },
    testTimeout: 15000,
    include: ['src/__tests__/**/*.test.{js,jsx}'],
    exclude: ['node_modules', 'e2e'],
  },
})
