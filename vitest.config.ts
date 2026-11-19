import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts?(x)'],
    // O build do Jenkins roda com cobertura num container lento: o padrão de 5 s estoura em testes
    // de tela que passam em segundos localmente.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    reporters: ['default', 'junit'],
    outputFile: { junit: 'reports/unit/junit.xml' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'cobertura'],
      reportsDirectory: 'coverage',
      include: ['src/domain/**/*.ts', 'src/features/**/*.tsx'],
    },
  },
})
