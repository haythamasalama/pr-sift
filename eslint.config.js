import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      'media',
      'apps/site/pages',
      'apps/site/public',
      '**/node_modules',
      '**/coverage',
      '.playwright-mcp',
      'apps/extension/src/components/ui/**',
      'apps/desktop/out',
      'apps/desktop/release',
    ],
  },
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
    files: ['**/DiffTable.vue', '**/CodeQuote.vue'],
    rules: { 'vue/no-v-html': 'off' },
  },
  {
    // GitHub renders descriptions and comments; sanitizeHtml cleans them again before v-html.
    files: ['**/PrPanel.vue', '**/GithubComment.vue'],
    rules: { 'vue/no-v-html': 'off' },
  },
  { files: ['**/*.config.{js,ts}', '**/scripts/**/*.mjs'], languageOptions: { globals: globals.node } },
  { files: ['apps/site/src/**/*.js'], languageOptions: { globals: globals.browser } },
  { files: ['apps/site/scripts/**/*.mjs'], languageOptions: { globals: globals.node } },
  // The demo's chrome shim is serialised into the page and runs in the browser.
  { files: ['apps/site/scripts/demo.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { files: ['tools/**/*.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { files: ['apps/desktop/src/main/**', 'apps/desktop/tests/**'], languageOptions: { globals: globals.node } },
  // Playwright serialises the callbacks given to page.evaluate and runs them in the app's window.
  { files: ['apps/desktop/tests/e2e/**'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  prettier,
)
