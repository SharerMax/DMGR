import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: false,
    react: true,
    typescript: true,
    ignores: [
      'node_modules',
      'dist',
      '*.local',
      '*.db',
      'PROJECT_CONTEXT.md',
      '**/prisma/generated/**',
      '.trae/**',
    ],
    rules: {
      'no-alert': 'off',
      'no-console': 'warn',
      'react-refresh/only-export-components': 'warn',
      'node/prefer-global/process': 'off',
      'unicorn/prefer-node-protocol': 'off',
      'antfu/top-level-function': 'off',
    },
  },
  {
    files: ['**/components/ui/*.tsx'],
    rules: {
      'react/no-nested-component-definitions': 'warn',
    },
  },
)
