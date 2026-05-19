module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    // TypeScript specific rules (继承 mira-server-sdk 规则)
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',

    // General rules (继承 mira-server-sdk 规则)
    'no-console': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',

    // Vue specific rules
    'vue/multi-word-component-names': 'off',
  },
  env: {
    node: true,
    browser: true,
    es6: true,
  },
  globals: {
    __dirname: 'readonly',
    __filename: 'readonly',
    process: 'readonly',
  },
  ignorePatterns: [
    'dist/',
    'dist-renderer/',
    'node_modules/',
    '*.js',
    '!vite.config.ts',
    '!tailwind.config.js',
    '!postcss.config.js',
  ],
}
