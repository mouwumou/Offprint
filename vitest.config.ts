import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Scaffolding phase: first real tests arrive with P0-3 (schema samples).
    passWithNoTests: true,
  },
})
