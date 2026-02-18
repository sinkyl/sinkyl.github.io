import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    project: z.enum(['xtranodly', 'bazaar', 'spatium']).optional(),
    tags: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    patterns: z.array(z.string()).default([]),
    architectures: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
