import { describe, it, expect } from "vitest";
import { saasConfigSchema } from "../../src/config/schema.js";
import { migrateConfig } from "../../src/config/migrate.js";

/**
 * Integration tests that simulate real config lifecycle scenarios
 */
describe("config lifecycle scenarios", () => {
  describe("startup preset flow", () => {
    it("init → stripe → db → auth → github → vercel", () => {
      // Step 1: Init with preset
      let config = saasConfigSchema.parse({
        version: 2,
        project: { name: "my-startup", framework: "nextjs", preset: "startup" },
        completedSteps: ["init"],
      });

      expect(config.project.preset).toBe("startup");

      // Step 2: Stripe
      config = saasConfigSchema.parse({
        ...config,
        stripe: {
          products: [
            { id: "prod_abc", name: "Pro", priceId: "price_abc", amount: 2999, interval: "month" },
            { id: "prod_def", name: "Enterprise", priceId: "price_def", amount: 9999, interval: "month" },
          ],
          webhookEndpoint: "https://my-startup.vercel.app/api/webhooks/stripe",
          webhookSecret: "whsec_test_123",
          portalConfigured: true,
          taxEnabled: false,
        },
        completedSteps: [...config.completedSteps, "stripe"],
      });

      expect(config.stripe?.products).toHaveLength(2);
      expect(config.completedSteps).toContain("stripe");

      // Step 3: Database (Supabase for startup preset)
      config = saasConfigSchema.parse({
        ...config,
        db: {
          provider: "supabase",
          connectionStringEnvVar: "DATABASE_URL",
          projectId: "ref-abc123",
          orm: "prisma",
        },
        completedSteps: [...config.completedSteps, "db"],
      });

      expect(config.db?.provider).toBe("supabase");

      // Step 4: Auth (Clerk for startup preset)
      config = saasConfigSchema.parse({
        ...config,
        auth: { provider: "clerk", configured: true },
        completedSteps: [...config.completedSteps, "auth"],
      });

      // Step 5: GitHub
      config = saasConfigSchema.parse({
        ...config,
        github: {
          repo: "user/my-startup",
          owner: "user",
          secretsConfigured: ["STRIPE_SECRET_KEY", "DATABASE_URL", "CLERK_SECRET_KEY"],
          branchProtection: true,
          workflowsAdded: ["ci.yml"],
        },
        completedSteps: [...config.completedSteps, "github"],
      });

      // Step 6: Vercel
      config = saasConfigSchema.parse({
        ...config,
        vercel: {
          projectId: "prj_abc123",
          projectName: "my-startup",
          domain: "my-startup.com",
          envScopes: ["development", "preview", "production"],
        },
        completedSteps: [...config.completedSteps, "vercel"],
      });

      // Verify final state
      expect(config.completedSteps).toEqual(["init", "stripe", "db", "auth", "github", "vercel"]);
      expect(config.stripe?.products).toHaveLength(2);
      expect(config.db?.provider).toBe("supabase");
      expect(config.auth?.provider).toBe("clerk");
      expect(config.github?.repo).toBe("user/my-startup");
      expect(config.vercel?.domain).toBe("my-startup.com");
    });
  });

  describe("minimal preset flow", () => {
    it("init → stripe → db → auth (NextAuth)", () => {
      const config = saasConfigSchema.parse({
        version: 2,
        project: { name: "side-project", framework: "nextjs", preset: "minimal" },
        stripe: {
          products: [
            { id: "prod_1", name: "Basic", priceId: "price_1", amount: 999, interval: "month" },
          ],
        },
        db: { provider: "neon", connectionStringEnvVar: "DATABASE_URL" },
        auth: { provider: "nextauth", configured: true },
        completedSteps: ["init", "stripe", "db", "auth"],
      });

      expect(config.project.preset).toBe("minimal");
      expect(config.github).toBeUndefined();
      expect(config.vercel).toBeUndefined();
      expect(config.email).toBeUndefined();
      expect(config.monitoring).toBeUndefined();
    });
  });

  describe("enterprise preset flow", () => {
    it("full config with all services", () => {
      const config = saasConfigSchema.parse({
        version: 2,
        project: { name: "enterprise-saas", framework: "nextjs", preset: "enterprise" },
        stripe: {
          products: [
            { id: "prod_1", name: "Starter", priceId: "price_1", amount: 2900, interval: "month" },
            { id: "prod_2", name: "Growth", priceId: "price_2", amount: 7900, interval: "month" },
            { id: "prod_3", name: "Enterprise", priceId: "price_3", amount: 29900, interval: "month" },
          ],
          webhookEndpoint: "https://enterprise-saas.com/api/webhooks/stripe",
          webhookSecret: "whsec_prod_123",
          portalConfigured: true,
          taxEnabled: true,
        },
        github: {
          repo: "company/enterprise-saas",
          owner: "company",
          secretsConfigured: ["STRIPE_SECRET_KEY", "DATABASE_URL", "CLERK_SECRET_KEY", "SENTRY_AUTH_TOKEN"],
          branchProtection: true,
          workflowsAdded: ["ci.yml", "deploy.yml"],
        },
        vercel: {
          projectId: "prj_enterprise",
          projectName: "enterprise-saas",
          domain: "enterprise-saas.com",
          envScopes: ["development", "preview", "production"],
        },
        db: {
          provider: "neon",
          connectionStringEnvVar: "DATABASE_URL",
          projectId: "neon_proj_123",
          orm: "drizzle",
        },
        auth: { provider: "clerk", configured: true },
        email: { provider: "resend", domain: "mail.enterprise-saas.com", configured: true },
        monitoring: {
          errorTracking: { provider: "sentry", dsn: "https://abc@sentry.io/123", projectSlug: "enterprise-saas" },
          analytics: { provider: "posthog", configured: true },
        },
        completedSteps: ["init", "stripe", "db", "auth", "email", "monitoring", "github", "vercel", "domain"],
      });

      expect(config.completedSteps).toHaveLength(9);
      expect(config.stripe?.products).toHaveLength(3);
      expect(config.stripe?.taxEnabled).toBe(true);
      expect(config.monitoring?.errorTracking?.provider).toBe("sentry");
      expect(config.monitoring?.analytics?.provider).toBe("posthog");
    });
  });

  describe("v1 migration to enterprise", () => {
    it("migrates old lucia config and extends to full enterprise", () => {
      const v1 = {
        version: 1,
        project: { name: "legacy-app", framework: "nextjs" },
        auth: { provider: "lucia", configured: true },
        completedSteps: ["init", "auth"],
      };

      const migrated = migrateConfig(v1);
      const config = saasConfigSchema.parse(migrated);

      expect(config.version).toBe(2);
      expect(config.auth?.provider).toBe("better-auth");

      // Now extend with new services
      const extended = saasConfigSchema.parse({
        ...config,
        stripe: {
          products: [{ id: "p1", name: "Pro", priceId: "pr1", amount: 1999, interval: "month" }],
        },
        db: { provider: "turso", connectionStringEnvVar: "TURSO_URL" },
        completedSteps: [...config.completedSteps, "stripe", "db"],
      });

      expect(extended.auth?.provider).toBe("better-auth");
      expect(extended.db?.provider).toBe("turso");
      expect(extended.completedSteps).toContain("stripe");
    });
  });
});

describe("schema edge cases in real scenarios", () => {
  it("empty stripe products array is valid", () => {
    const config = saasConfigSchema.parse({
      version: 2,
      project: { name: "no-products-yet", framework: "nextjs" },
      stripe: { products: [] },
      completedSteps: ["init"],
    });
    expect(config.stripe?.products).toEqual([]);
  });

  it("multiple products with different intervals", () => {
    const config = saasConfigSchema.parse({
      version: 2,
      project: { name: "mixed", framework: "nextjs" },
      stripe: {
        products: [
          { id: "p1", name: "Monthly Pro", priceId: "pr1", amount: 2999, interval: "month" },
          { id: "p2", name: "Annual Pro", priceId: "pr2", amount: 29900, interval: "year" },
          { id: "p3", name: "Lifetime", priceId: "pr3", amount: 49900, interval: "one_time" },
        ],
      },
      completedSteps: [],
    });
    expect(config.stripe?.products).toHaveLength(3);
  });

  it("zero-dollar product (free tier)", () => {
    const config = saasConfigSchema.parse({
      version: 2,
      project: { name: "freemium", framework: "nextjs" },
      stripe: {
        products: [
          { id: "p1", name: "Free", priceId: "pr1", amount: 0, interval: "month" },
        ],
      },
      completedSteps: [],
    });
    expect(config.stripe?.products?.[0]?.amount).toBe(0);
  });

  it("config with only monitoring (no other services)", () => {
    const config = saasConfigSchema.parse({
      version: 2,
      project: { name: "monitored-only", framework: "astro" },
      monitoring: {
        analytics: { provider: "posthog", configured: true },
      },
      completedSteps: ["init", "monitoring"],
    });
    expect(config.monitoring?.errorTracking).toBeUndefined();
    expect(config.monitoring?.analytics?.provider).toBe("posthog");
  });

  it("all SvelteKit-specific defaults", () => {
    const config = saasConfigSchema.parse({
      version: 2,
      project: { name: "sveltekit-app", framework: "sveltekit" },
      completedSteps: ["init"],
    });
    expect(config.project.framework).toBe("sveltekit");
  });

  it("config with storage and jobs (future providers)", () => {
    const config = saasConfigSchema.parse({
      version: 2,
      project: { name: "full-featured", framework: "nextjs" },
      storage: { provider: "uploadthing", configured: true },
      jobs: { provider: "inngest", configured: true },
      completedSteps: [],
    });
    expect(config.storage?.provider).toBe("uploadthing");
    expect(config.jobs?.provider).toBe("inngest");
  });
});
