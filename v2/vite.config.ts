import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { photoConversion } from './dev/photoConversion.ts'
import { audioConversion } from './dev/audioConversion.ts'

export default defineConfig({
  plugins: [preact(), photoConversion(), audioConversion()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
