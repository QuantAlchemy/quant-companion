import eslint from '@eslint/js'
import html from 'eslint-plugin-html'
import tseslint from 'typescript-eslint'
import eslintPluginSolid from 'eslint-plugin-solid'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: ['dist/**', 'build/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      html,
      solid: eslintPluginSolid,
    },
    rules: {
      ...eslintPluginSolid.configs.recommended.rules,
      // Add any custom rules here
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'solid/no-destructure': 'warn',
      'solid/jsx-no-undef': 'error',
    },
  },
  eslintConfigPrettier
)
