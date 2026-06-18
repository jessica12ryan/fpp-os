import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      indent: ['warn', 2],
      'linebreak-style': ['error', 'unix'],
      quotes: ['warn', 'single'],
      semi: ['warn', 'never'],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'preserve-caught-error': 'off',
    },
  },
]
