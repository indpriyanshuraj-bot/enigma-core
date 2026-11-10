import { defineConfig } from 'rolldown';

export default defineConfig([
  {
    input: { index: 'src/index.ts' },
    output: {
      dir: 'dist',
      format: 'esm',
      entryFileNames: '[name].js',
      sourcemap: true,
      minify: false,
      comments: false,
    },
    platform: 'neutral',
  },
  {
    input: { render: 'src/render/index.ts' },
    output: {
      dir: 'dist',
      format: 'esm',
      entryFileNames: '[name].js',
      sourcemap: true,
      minify: false,
      comments: false,
    },
    platform: 'neutral',
  },
]);
