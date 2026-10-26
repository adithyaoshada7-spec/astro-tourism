import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const places = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/places" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    location: z.string(),
    district: z.string(),
    bestTimeToVisit: z.string(),
    category: z.enum(['Beach', 'Cultural', 'Nature', 'Adventure', 'Historical']),
    heroImage: z.string().optional(),
    rating: z.number().default(4.5),
    tags: z.array(z.string()),
    keyHighlights: z.array(z.string()),
  }),
});

export const collections = { places };
