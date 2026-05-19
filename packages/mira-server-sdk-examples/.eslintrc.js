module.exports = {
    parser: '@typescript-eslint/parser',
    extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
    ],
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
    },
    rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'no-console': 'off', // 允许在示例中使用 console
        'prefer-const': 'error',
        'no-var': 'error',
        'semi': ['error', 'always'],
        'quotes': ['error', 'single'],
        'comma-dangle': ['error', 'only-multiline'],
    },
    env: {
        node: true,
        jest: true,
        es6: true,
    },
    globals: {
        File: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        fetch: 'readonly',
    },
    ignorePatterns: [
        'dist/',
        'node_modules/',
        '*.js',
        'coverage/',
    ],
};
