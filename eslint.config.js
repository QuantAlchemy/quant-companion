import eslint from '@eslint/js'
import html from 'eslint-plugin-html'
import tseslint from 'typescript-eslint'
import eslintPluginSolid from 'eslint-plugin-solid'
import eslintConfigPrettier from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'

export default tseslint.config(
  {
    ignores: ['dist/**', 'build/**', 'node_modules/**', '.vscode/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      html,
      solid: eslintPluginSolid,
      prettier: prettierPlugin,
    },
    rules: {
      ...eslintPluginSolid.configs.recommended.rules,
      'prettier/prettier': 'warn', // Prettier as an ESLint rule
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'solid/no-destructure': 'warn',
      'solid/jsx-no-undef': 'error',
    },
  },
  eslintConfigPrettier // Extending Prettier configuration to disable conflicting ESLint rules
)
