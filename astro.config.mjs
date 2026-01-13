import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // Replace with your GitHub Pages URL
  site: 'https://sinkyl.github.io',
  // If using a repo name other than username.github.io, set base
  // base: '/blog',
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
