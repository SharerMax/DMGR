import antfu from '@antfu/eslint-config'

export default antfu({
  vue: false,
  react: true,
  typescript: true,
  ignores: [
    'node_modules',
    'dist',
    '*.local',
    '*.db',
    'PROJECT_CONTEXT.md',
  ],
  rules: {
    'no-alert': 'off',
    'no-console': 'warn',
    'react-refresh/only-export-components': 'warn',
    'node/prefer-global/process': 'off',
    'unicorn/prefer-node-protocol': 'off',
    'antfu/top-level-function': 'off',
  },
})
