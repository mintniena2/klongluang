import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }

          // Also emit a standalone single-file HTML into docs/index.html for 1-file GitHub Pages hosting
          const distIndex = path.join(distDir, 'index.html');
          if (fs.existsSync(distIndex)) {
            let html = fs.readFileSync(distIndex, 'utf8');
            html = html.replace(
              /<link\s+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi,
              (match, href: string) => {
                const cleanPath = href.replace(/^\.\//, '').replace(/^\//, '');
                const fullPath = path.join(distDir, cleanPath);
                if (fs.existsSync(fullPath)) {
                  const css = fs.readFileSync(fullPath, 'utf8');
                  return `<style>${css}</style>`;
                }
                return match;
              }
            );
            html = html.replace(
              /<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/gi,
              (match, src: string) => {
                const cleanPath = src.replace(/^\.\//, '').replace(/^\//, '');
                const fullPath = path.join(distDir, cleanPath);
                if (fs.existsSync(fullPath)) {
                  const js = fs
                    .readFileSync(fullPath, 'utf8')
                    .replace(/<\/script/gi, '<\\/script');
                  return `<script type="module">${js}</script>`;
                }
                return match;
              }
            );
            const docsDir = path.resolve(__dirname, 'docs');
            fs.mkdirSync(docsDir, {recursive: true});
            fs.writeFileSync(path.join(docsDir, 'index.html'), html, 'utf8');
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
