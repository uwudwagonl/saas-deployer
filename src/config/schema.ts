import { z } from "zod";

export const stripeProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceId: z.string(),
  amount: z.number(),
  interval: z.enum(["month", "year", "one_time"]),
});

export const saasConfigSchema = z.object({
  version: z.literal(1),
  project: z.object({
    name: z.string(),
    framework: z.enum(["nextjs", "remix", "nuxt", "sveltekit", "astro", "other"]),
  }),
  stripe: z
    .object({
      products: z.array(stripeProductSchema).default([]),
      webhookEndpoint: z.string().optional(),
      webhookSecret: z.string().optional(),
    })
    .optional(),
  github: z
    .object({
      repo: z.string(),
      secretsConfigured: z.array(z.string()).default([]),
    })
    .optional(),
  vercel: z
    .object({
      projectId: z.string().optional(),
      domain: z.string().optional(),
    })
    .optional(),
  db: z
    .object({
      provider: z.enum(["supabase", "neon", "planetscale", "turso", "other"]),
      connectionStringEnvVar: z.string().default("DATABASE_URL"),
    })
    .optional(),
  auth: z
    .object({
      provider: z.enum(["clerk", "nextauth", "supabase", "lucia", "other"]),
    })
    .optional(),
  completedSteps: z.array(z.string()).default([]),
});

export type SaasConfig = z.infer<typeof saasConfigSchema>;
export type StripeProduct = z.infer<typeof stripeProductSchema>;
