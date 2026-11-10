import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['**/dist', '**/node_modules', '**/coverage', '.playwright-mcp', 'apps/extension/src/components/ui/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      globals: { ...globals.browser, chrome: 'readonly' },
      parserOptions: { parser: tseslint.parser },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // highlight.js escapes the code it returns, so rendering it with v-html is safe here.
    files: ['**/DiffTable.vue'],
    rules: { 'vue/no-v-html': 'off' },
  },
  { files: ['**/*.config.{js,ts}', '**/scripts/**/*.mjs'], languageOptions: { globals: globals.node } },
  prettier,
)
