import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/shared/sdk/index.ts'),
      name: 'MiraSDK',
      fileName: 'mira-sdk.esm',
      formats: ['es'],
    },
    rollupOptions: {
      external: [],
      output: {
        format: 'es',
        entryFileNames: 'mira-sdk.esm.mjs',
        inlineDynamicImports: true,
      },
    },
    outDir: 'dist/shared/sdk',
    emptyOutDir: false,
    target: 'es2020',
    minify: false,
    sourcemap: true,
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
