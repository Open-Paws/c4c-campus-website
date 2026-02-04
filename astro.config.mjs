// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: vercel(),
  vite: {
    // @ts-expect-error - @tailwindcss/vite types are incompatible with Astro's bundled Vite types
    plugins: [tailwindcss()],
    build: {
      // Enable code splitting and chunk optimization
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks for better caching
            'chart': ['chart.js', 'react-chartjs-2'],
            'editor': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-link', '@tiptap/extension-placeholder'],
            'supabase': ['@supabase/supabase-js', '@supabase/storage-js'],
          },
          // Optimize chunk naming for better caching
          chunkFileNames: () => {
            return `assets/[name].[hash].js`;
          },
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 600,
      // Enable minification
      minify: 'esbuild',
      // Target modern browsers for smaller bundles
      target: 'es2020',
    },
    // Performance optimizations
    optimizeDeps: {
      include: ['react', 'react-dom', '@supabase/supabase-js', 'fast-deep-equal'],
      exclude: ['chart.js'],
    },
  },
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
    assets: '_astro',
  },
  // Enable image optimization
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    remotePatterns: [{ protocol: 'https' }],
  },
  // Add prefetch for better navigation
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  site: 'https://codeforcompassion.com',
  redirects: {
    '/admin': '/teacher/courses',
    '/teacher': '/teacher/courses',
  },
  // Security headers
  experimental: {
    clientPrerender: true,
  },
  // Enable middleware for server-side auth checks
  middleware: true,
});
