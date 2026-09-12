// eslint.config.js  (repo root)
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**'] },

  // base JS + TS rules for every .ts/.tsx in the repo
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },

  // client only: React rules + browser globals
  {
    files: ['client/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
  },

  // server + shared: Node globals
  {
    files: ['server/**/*.ts', 'shared/**/*.ts'],
    languageOptions: { globals: globals.node },
  },

  // must be last: switch off rules that fight Prettier
  prettier,
)