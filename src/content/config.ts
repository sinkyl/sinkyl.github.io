import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
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

// Project description/overview content for header carousel
const projects = defineCollection({
  type: 'content',
  schema: z.object({
    project: z.enum(['xtranodly', 'bazaar', 'spatium']),
  }),
});

export const collections = { blog, projects };
