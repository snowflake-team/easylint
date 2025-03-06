import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    clean: true,
    dts: false,
    shims: false,
    splitting: false,
    sourcemap: false,
    minify: true,
    treeshake: true,
    outDir: 'dist',
    target: 'node14',
});
