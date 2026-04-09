import { z } from "zod";

// --- Stripe ---
export const stripeProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceId: z.string(),
  amount: z.number(),
  interval: z.enum(["month", "year", "one_time"]),
});

// --- Main Config ---
export const saasConfigSchema = z.object({
  version: z.literal(2),
  project: z.object({
    name: z.string(),
    framework: z.enum([
      "nextjs",
      "remix",
      "nuxt",
      "sveltekit",
      "astro",
      "other",
    ]),
    preset: z
      .enum(["minimal", "startup", "enterprise", "custom"])
      .optional(),
  }),
  stripe: z
    .object({
      products: z.array(stripeProductSchema).default([]),
      webhookEndpoint: z.string().optional(),
      webhookSecret: z.string().optional(),
      portalConfigured: z.boolean().default(false),
      taxEnabled: z.boolean().default(false),
    })
    .optional(),
  github: z
    .object({
      repo: z.string(),
      owner: z.string().optional(),
      secretsConfigured: z.array(z.string()).default([]),
      branchProtection: z.boolean().default(false),
      workflowsAdded: z.array(z.string()).default([]),
    })
    .optional(),
  vercel: z
    .object({
      projectId: z.string().optional(),
      projectName: z.string().optional(),
      domain: z.string().optional(),
      envScopes: z
        .array(z.enum(["development", "preview", "production"]))
        .default([]),
    })
    .optional(),
  db: z
    .object({
      provider: z.enum([
        "supabase",
        "neon",
        "planetscale",
        "turso",
        "other",
      ]),
      connectionStringEnvVar: z.string().default("DATABASE_URL"),
      projectId: z.string().optional(),
      orm: z.enum(["prisma", "drizzle", "none"]).optional(),
    })
    .optional(),
  auth: z
    .object({
      provider: z.enum([
        "clerk",
        "nextauth",
        "supabase",
        "better-auth",
        "other",
      ]),
      configured: z.boolean().default(false),
    })
    .optional(),
  email: z
    .object({
      provider: z.enum(["resend", "sendgrid", "postmark", "other"]),
      domain: z.string().optional(),
      configured: z.boolean().default(false),
    })
    .optional(),
  monitoring: z
    .object({
      errorTracking: z
        .object({
          provider: z.enum(["sentry", "other"]),
          dsn: z.string().optional(),
          projectSlug: z.string().optional(),
        })
        .optional(),
      analytics: z
        .object({
          provider: z.enum(["posthog", "vercel-analytics", "other"]),
          configured: z.boolean().default(false),
        })
        .optional(),
    })
    .optional(),
  storage: z
    .object({
      provider: z.enum([
        "cloudflare-r2",
        "uploadthing",
        "s3",
        "supabase-storage",
        "other",
      ]),
      configured: z.boolean().default(false),
    })
    .optional(),
  jobs: z
    .object({
      provider: z.enum(["inngest", "trigger-dev", "upstash", "bullmq", "other"]),
      configured: z.boolean().default(false),
    })
    .optional(),
  completedSteps: z.array(z.string()).default([]),
});

export type SaasConfig = z.infer<typeof saasConfigSchema>;
export type StripeProduct = z.infer<typeof stripeProductSchema>;
