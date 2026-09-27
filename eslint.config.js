import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite, { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] })
