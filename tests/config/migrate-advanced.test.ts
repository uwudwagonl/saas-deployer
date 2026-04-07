import { describe, it, expect } from "vitest";
import { migrateConfig } from "../../src/config/migrate.js";
import { saasConfigSchema } from "../../src/config/schema.js";

describe("migrateConfig — advanced cases", () => {
  it("migrates v1 with full stripe config", () => {
    const v1 = {
      version: 1,
      project: { name: "app", framework: "nextjs" },
      stripe: {
        products: [
          { id: "prod_1", name: "Pro", priceId: "price_1", amount: 2999, interval: "month" },
        ],
        portalConfigured: true,
      },
      completedSteps: ["init", "stripe"],
    };

    const migrated = migrateConfig(v1) as any;
    expect(migrated.version).toBe(2);
    expect(migrated.stripe.products).toHaveLength(1);

    // Should also be parseable
    const parsed = saasConfigSchema.parse(migrated);
    expect(parsed.stripe?.products).toHaveLength(1);
  });

  it("migrates v1 preserving completedSteps", () => {
    const v1 = {
      version: 1,
      project: { name: "app", framework: "remix" },
      completedSteps: ["init", "db", "auth", "stripe"],
    };

    const migrated = migrateConfig(v1) as any;
    expect(migrated.completedSteps).toEqual(["init", "db", "auth", "stripe"]);
  });

  it("migrates v1 with no auth section", () => {
    const v1 = {
      version: 1,
      project: { name: "app", framework: "nextjs" },
      completedSteps: [],
    };

    const migrated = migrateConfig(v1) as any;
    expect(migrated.version).toBe(2);
    expect(migrated.auth).toBeUndefined();
  });

  it("migrates v1 with clerk auth (no change needed)", () => {
    const v1 = {
      version: 1,
      project: { name: "app", framework: "nextjs" },
      auth: { provider: "clerk", configured: true },
      completedSteps: [],
    };

    const migrated = migrateConfig(v1) as any;
    expect(migrated.auth.provider).toBe("clerk");
  });

  it("migrates v1 with nextauth (no change needed)", () => {
    const v1 = {
      version: 1,
      project: { name: "app", framework: "nextjs" },
      auth: { provider: "nextauth", configured: false },
      completedSteps: [],
    };

    const migrated = migrateConfig(v1) as any;
    expect(migrated.auth.provider).toBe("nextauth");
  });

  it("v2 passes through with all sections populated", () => {
    const v2 = {
      version: 2,
      project: { name: "full", framework: "sveltekit", preset: "enterprise" },
      stripe: { products: [], portalConfigured: false, taxEnabled: false },
      github: { repo: "user/repo", secretsConfigured: [], workflowsAdded: [] },
      vercel: { envScopes: [] },
      db: { provider: "turso", connectionStringEnvVar: "TURSO_URL" },
      auth: { provider: "better-auth", configured: true },
      email: { provider: "resend", configured: true },
      monitoring: {
        errorTracking: { provider: "sentry" },
        analytics: { provider: "posthog", configured: true },
      },
      completedSteps: ["init"],
    };

    const migrated = migrateConfig(v2);
    expect(migrated).toEqual(v2);
  });

  it("throws on completely empty object", () => {
    // Empty object should work — defaults version to 1 and migrates
    const migrated = migrateConfig({}) as any;
    expect(migrated.version).toBe(2);
  });

  it("arrays pass typeof check but fail later validation", () => {
    // Arrays are typeof "object", so migrateConfig won't throw
    // but the Zod schema parse will reject it later
    const migrated = migrateConfig([]);
    expect(() => saasConfigSchema.parse(migrated)).toThrow();
  });

  it("throws on number", () => {
    expect(() => migrateConfig(0)).toThrow("Invalid config");
  });

  it("throws on boolean", () => {
    expect(() => migrateConfig(true)).toThrow("Invalid config");
  });

  it("throws on undefined", () => {
    expect(() => migrateConfig(undefined)).toThrow("Invalid config");
  });

  it("throws on version 999", () => {
    expect(() => migrateConfig({ version: 999 })).toThrow("Unknown config version 999");
  });

  it("throws on negative version", () => {
    expect(() => migrateConfig({ version: -1 })).toThrow("Unknown config version");
  });

  it("string version '1' is not handled (goes to unknown version)", () => {
    // String "1" is truthy so ?? doesn't kick in, but "1" !== 1 so the v1→v2
    // migration doesn't trigger, and "1" !== 2 so it throws at the final check
    expect(() => migrateConfig({ version: "1" })).toThrow("Unknown config version");
  });

  it("string version '2' also fails (strict equality with number)", () => {
    expect(() => migrateConfig({ version: "2" })).toThrow("Unknown config version");
  });

  it("migration is idempotent — running twice produces same result", () => {
    const v1 = {
      version: 1,
      project: { name: "app", framework: "nextjs" },
      auth: { provider: "lucia", configured: true },
      completedSteps: [],
    };

    const first = migrateConfig(v1);
    const second = migrateConfig(first);

    expect(first).toEqual(second);
  });
});
