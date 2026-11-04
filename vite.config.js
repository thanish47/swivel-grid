import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(import.meta.dirname, 'SwivelGrid.js'),
            name: 'SwivelGrid',
            formats: ['es', 'umd'],
            fileName: (format) =>
                format === 'es' ? 'swivel-grid.esm.js' : 'swivel-grid.umd.cjs',
        },
        outDir: 'dist',
        emptyOutDir: true,
    },
});
