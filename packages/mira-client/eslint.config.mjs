import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

// 迁移自 .eslintrc.js（ESLint 9 flat config）
const lintFiles = ['**/*.{js,mjs,cjs,ts,tsx,cts,mts,vue}']

export default tseslint.config(
  {
    ignores: [
      'dist*/**',
      'build/**',
      'docs/**',
      'coverage/**',
      // 原 ignorePatterns '*.js'：js 文件不参与 lint（根目录 tailwind/postcss 配置除外）
      'scripts/**/*.js',
      'src/**/*.js',
      'src/**/*.cjs',
      '.dependency-cruiser.js',
      // port-react-to-vue 的参考文件，非本项目代码
      'loader3-component.tsx',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended.map(cfg => (cfg.files ? { ...cfg, files: lintFiles } : cfg)),
  pluginVue.configs['flat/essential'],
  {
    // .vue 的 script 部分用 TypeScript 解析器
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          // 空 catch（有意吞错）不报未使用
          caughtErrors: 'none',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      // Electron main 进程动态 require 是惯例
      '@typescript-eslint/no-require-imports': 'warn',

      // General rules
      'no-console': 'off',
      // 空 catch（有意吞错）放行，其余空块仍报错
      'no-empty': ['error', { allowEmptyCatch: true }],
      // cond && fn() 短路调用是项目惯用写法
      'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',

      // Vue specific rules
      'vue/multi-word-component-names': 'off',
      // prop 传 composable refs 集合 / ref 对象是项目既有模式，深层 .value 赋值放行
      'vue/no-mutating-props': ['error', { shallowOnly: true }],
    },
  },
  {
    // .vue：模板引用导致 unused-vars 误报，未用变量由 vue-tsc(noUnusedLocals) 覆盖
    files: ['**/*.vue'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    // 类型声明文件：Vue 官方模板写法（DefineComponent<{}, {}, any> 等）
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
