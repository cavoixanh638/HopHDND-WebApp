import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './',
  optimizeDeps: { entries: mode==='benchcloud'?['qa-benchmark.html']:mode.startsWith('pages')?['pages.html']:['index.html'] },
  build: { cssCodeSplit: false, rolldownOptions: { ...(mode==='benchcloud'?{input:'qa-benchmark.html'}:mode.startsWith('pages')?{input:'pages.html'}:{}),output: mode.startsWith('pages')?{}:{codeSplitting:false} } },
  resolve: mode === 'preact'||mode.startsWith('pages') ? {
    alias: [
      { find: /^react-dom\/client$/, replacement: 'preact/compat/client' },
      { find: /^react-dom$/, replacement: 'preact/compat' },
      { find: /^react\/jsx-runtime$/, replacement: 'preact/jsx-runtime' },
      { find: /^react\/jsx-dev-runtime$/, replacement: 'preact/jsx-dev-runtime' },
      { find: /^react$/, replacement: 'preact/compat' },
    ],
  } : undefined,
}));
