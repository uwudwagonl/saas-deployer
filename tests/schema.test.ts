import { describe, it, expect } from "vitest";
import { saasConfigSchema, stripeProductSchema } from "../src/config/schema.js";

describe("stripeProductSchema", () => {
  it("accepts a valid product", () => {
    const result = stripeProductSchema.safeParse({
      id: "prod_abc123",
      name: "Pro Plan",
      priceId: "price_abc123",
      amount: 2999,
      interval: "month",
    });
    expect(result.success).toBe(true);
  });

  it("accepts yearly interval", () => {
    const result = stripeProductSchema.safeParse({
      id: "prod_abc",
      name: "Annual",
      priceId: "price_abc",
      amount: 29900,
      interval: "year",
    });
    expect(result.success).toBe(true);
  });

  it("accepts one_time interval", () => {
    const result = stripeProductSchema.safeParse({
      id: "prod_abc",
      name: "Lifetime",
      priceId: "price_abc",
      amount: 99900,
      interval: "one_time",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid interval", () => {
    const result = stripeProductSchema.safeParse({
      id: "prod_abc",
      name: "Bad",
      priceId: "price_abc",
      amount: 100,
      interval: "weekly",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = stripeProductSchema.safeParse({
      id: "prod_abc",
      priceId: "price_abc",
      amount: 100,
      interval: "month",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric amount", () => {
    const result = stripeProductSchema.safeParse({
      id: "prod_abc",
      name: "Test",
      priceId: "price_abc",
      amount: "ten",
      interval: "month",
    });
    expect(result.success).toBe(false);
  });
});

describe("saasConfigSchema", () => {
  const minimalValid = {
    version: 2 as const,
    project: { name: "test-app", framework: "nextjs" as const },
    completedSteps: [],
  };

  it("accepts minimal valid config", () => {
    const result = saasConfigSchema.safeParse(minimalValid);
    expect(result.success).toBe(true);
  });

  it("accepts all framework values", () => {
    const frameworks = ["nextjs", "remix", "nuxt", "sveltekit", "astro", "other"];
    for (const fw of frameworks) {
      const result = saasConfigSchema.safeParse({
        ...minimalValid,
        project: { name: "test", framework: fw },
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects unknown framework", () => {
    const result = saasConfigSchema.safeParse({
      ...minimalValid,
      project: { name: "test", framework: "angular" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects version 1", () => {
    const result = saasConfigSchema.safeParse({
      ...minimalValid,
      version: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects version 3", () => {
    const result = saasConfigSchema.safeParse({
      ...minimalValid,
      version: 3,
    });
    expect(result.success).toBe(false);
  });

  it("accepts config with preset", () => {
    const result = saasConfigSchema.safeParse({
      ...minimalValid,
      project: { name: "test", framework: "nextjs", preset: "startup" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts all preset values", () => {
    for (const preset of ["minimal", "startup", "enterprise", "custom"]) {
      const result = saasConfigSchema.safeParse({
        ...minimalValid,
        project: { name: "test", framework: "nextjs", preset },
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts full stripe config", () => {
    const result = saasConfigSchema.safeParse({
      ...minimalValid,
      stripe: {
        products: [
          { id: "prod_1", name: "Pro", priceId: "price_1", amount: 2999, interval: "month" },
        ],
        webhookEndpoint: "we_123",
        webhookSecret: "whsec_123",
        portalConfigured: true,
        taxEnabled: false,
      },
    });
    expect(result.success).toBe(true);
  });

  it("defaults stripe products to empty array", () => {
    const result = saasConfigSchema.parse({
      ...minimalValid,
      stripe: {},
    });
    expect(result.stripe?.products).toEqual([]);
  });

  it("accepts full github config", () => {
    const result = saasConfigSchema.safeParse({
      ...minimalValid,
      github: {
        repo: "user/repo",
        owner: "user",
        secretsConfigured: ["STRIPE_SECRET_KEY"],
        branchProtection: true,
        workflowsAdded: ["ci.yml"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("requires github.repo", () => {
    const result = saasConfigSchema.safeParse({
      ...minimalValid,
      github: { owner: "user" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts full vercel config", () => {
    const result = saasConfigSchema.safeParse({
      ...minimalValid,
      vercel: {
        projectId: "prj_123",
        projectName: "my-app",
        domain: "app.example.com",
        envScopes: ["development", "production"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts all database providers", () => {
    for (const provider of ["supabase", "neon", "planetscale", "turso", "other"]) {
      const result = saasConfigSchema.safeParse({
        ...minimalValid,
        db: { provider },
      });
      expect(result.success).toBe(true);
    }
  });

  it("defaults db connectionStringEnvVar to DATABASE_URL", () => {
    const result = saasConfigSchema.parse({
      ...minimalValid,
      db: { provider: "neon" },
    });
    expect(result.db?.connectionStringEnvVar).toBe("DATABASE_URL");
  });

  it("accepts all ORM options", () => {
    for (const orm of ["prisma", "drizzle", "none"]) {
      const result = saasConfigSchema.safeParse({
        ...minimalValid,
        db: { provider: "neon", orm },
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all auth providers", () => {
    for (const provider of ["clerk", "nextauth", "supabase", "better-auth", "other"]) {
      const result = saasConfigSchema.safeParse({
        ...minimalValid,
        auth: { provider },
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts email config", () => {
    const result = saasConfigSchema.safeParse({
      ...minimalValid,
      email: { provider: "resend", domain: "mail.example.com", configured: true },
    });
    expect(result.success).toBe(true);
  });

  it("accepts all email providers", () => {
    for (const provider of ["resend", "sendgrid", "postmark", "other"]) {
      const result = saasConfigSchema.safeParse({
        ...minimalValid,
        email: { provider },
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts monitoring config with error tracking", () => {
    const result = saasConfigSchema.safeParse({
      ...minimalValid,
      monitoring: {
        errorTracking: {
          provider: "sentry",
          dsn: "https://abc@sentry.io/123",
          projectSlug: "my-app",
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts monitoring config with analytics", () => {
    const result = saasConfigSchema.safeParse({
      ...minimalValid,
      monitoring: {
        analytics: {
          provider: "posthog",
          configured: true,
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts storage config", () => {
    for (const provider of ["cloudflare-r2", "uploadthing", "s3", "supabase-storage", "other"]) {
      const result = saasConfigSchema.safeParse({
        ...minimalValid,
        storage: { provider, configured: true },
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts jobs config", () => {
    for (const provider of ["inngest", "trigger-dev", "other"]) {
      const result = saasConfigSchema.safeParse({
        ...minimalValid,
        jobs: { provider, configured: true },
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts completedSteps with multiple entries", () => {
    const result = saasConfigSchema.safeParse({
      ...minimalValid,
      completedSteps: ["init", "stripe", "db", "auth", "github", "vercel"],
    });
    expect(result.success).toBe(true);
  });

  it("defaults completedSteps to empty array", () => {
    const result = saasConfigSchema.parse({
      version: 2,
      project: { name: "test", framework: "nextjs" },
    });
    expect(result.completedSteps).toEqual([]);
  });

  it("accepts full kitchen-sink config", () => {
    const result = saasConfigSchema.safeParse({
      version: 2,
      project: { name: "mega-saas", framework: "nextjs", preset: "enterprise" },
      stripe: {
        products: [
          { id: "prod_1", name: "Free", priceId: "price_1", amount: 0, interval: "month" },
          { id: "prod_2", name: "Pro", priceId: "price_2", amount: 2999, interval: "month" },
          { id: "prod_3", name: "Enterprise", priceId: "price_3", amount: 99900, interval: "year" },
        ],
        webhookEndpoint: "we_test_123",
        webhookSecret: "whsec_test_123",
        portalConfigured: true,
        taxEnabled: true,
      },
      github: {
        repo: "company/mega-saas",
        owner: "company",
        secretsConfigured: ["STRIPE_SECRET_KEY", "DATABASE_URL"],
        branchProtection: true,
        workflowsAdded: ["ci.yml", "deploy.yml"],
      },
      vercel: {
        projectId: "prj_abc123",
        projectName: "mega-saas",
        domain: "mega-saas.com",
        envScopes: ["development", "preview", "production"],
      },
      db: {
        provider: "neon",
        connectionStringEnvVar: "DATABASE_URL",
        projectId: "neon_123",
        orm: "drizzle",
      },
      auth: { provider: "clerk", configured: true },
      email: { provider: "resend", domain: "mail.mega-saas.com", configured: true },
      monitoring: {
        errorTracking: { provider: "sentry", dsn: "https://abc@sentry.io/123", projectSlug: "mega-saas" },
        analytics: { provider: "posthog", configured: true },
      },
      storage: { provider: "cloudflare-r2", configured: true },
      jobs: { provider: "inngest", configured: true },
      completedSteps: ["init", "stripe", "db", "auth", "email", "github", "vercel", "monitoring"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing project name", () => {
    const result = saasConfigSchema.safeParse({
      version: 2,
      project: { framework: "nextjs" },
      completedSteps: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing framework", () => {
    const result = saasConfigSchema.safeParse({
      version: 2,
      project: { name: "test" },
      completedSteps: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing version", () => {
    const result = saasConfigSchema.safeParse({
      project: { name: "test", framework: "nextjs" },
      completedSteps: [],
    });
    expect(result.success).toBe(false);
  });
});
