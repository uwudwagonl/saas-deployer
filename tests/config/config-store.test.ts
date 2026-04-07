import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// We need to mock projectPath to use a temp dir
// The store module uses projectPath internally, so we test via readJson/writeJson directly
import { readJson, writeJson, fileExists } from "../../src/utils/fs.js";
import { migrateConfig } from "../../src/config/migrate.js";
import { saasConfigSchema } from "../../src/config/schema.js";

describe("config store integration", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "saas-config-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("round-trips a config through write → read → migrate → parse", async () => {
    const configPath = join(tmpDir, "saas.config.json");
    const config = {
      version: 2,
      project: { name: "round-trip", framework: "nextjs" },
      completedSteps: ["init"],
    };

    await writeJson(configPath, config);
    const raw = await readJson(configPath);
    const migrated = migrateConfig(raw);
    const parsed = saasConfigSchema.parse(migrated);

    expect(parsed.version).toBe(2);
    expect(parsed.project.name).toBe("round-trip");
    expect(parsed.project.framework).toBe("nextjs");
    expect(parsed.completedSteps).toEqual(["init"]);
  });

  it("migrates v1 config through the full pipeline", async () => {
    const configPath = join(tmpDir, "saas.config.json");
    const v1Config = {
      version: 1,
      project: { name: "legacy", framework: "nextjs" },
      auth: { provider: "lucia", configured: true },
      completedSteps: ["init", "auth"],
    };

    await writeJson(configPath, v1Config);
    const raw = await readJson(configPath);
    const migrated = migrateConfig(raw);
    const parsed = saasConfigSchema.parse(migrated);

    expect(parsed.version).toBe(2);
    expect(parsed.auth?.provider).toBe("better-auth");
    expect(parsed.auth?.configured).toBe(true);
  });

  it("handles config with all optional fields", async () => {
    const configPath = join(tmpDir, "saas.config.json");
    const fullConfig = {
      version: 2,
      project: { name: "full-app", framework: "sveltekit", preset: "enterprise" },
      stripe: {
        products: [
          { id: "prod_1", name: "Basic", priceId: "price_1", amount: 999, interval: "month" },
        ],
        webhookEndpoint: "we_123",
        webhookSecret: "whsec_abc",
        portalConfigured: true,
        taxEnabled: true,
      },
      db: { provider: "turso", connectionStringEnvVar: "TURSO_URL", orm: "drizzle" },
      auth: { provider: "better-auth", configured: true },
      email: { provider: "resend", configured: true },
      monitoring: {
        errorTracking: { provider: "sentry", dsn: "https://abc@sentry.io/1" },
        analytics: { provider: "posthog", configured: true },
      },
      completedSteps: ["init", "stripe", "db", "auth", "email", "monitoring"],
    };

    await writeJson(configPath, fullConfig);
    const raw = await readJson(configPath);
    const migrated = migrateConfig(raw);
    const parsed = saasConfigSchema.parse(migrated);

    expect(parsed.stripe?.products).toHaveLength(1);
    expect(parsed.stripe?.portalConfigured).toBe(true);
    expect(parsed.db?.provider).toBe("turso");
    expect(parsed.db?.orm).toBe("drizzle");
    expect(parsed.monitoring?.errorTracking?.provider).toBe("sentry");
    expect(parsed.monitoring?.analytics?.configured).toBe(true);
    expect(parsed.email?.provider).toBe("resend");
  });

  it("creates then extends config incrementally", async () => {
    const configPath = join(tmpDir, "saas.config.json");

    // Step 1: Init
    const config: any = {
      version: 2,
      project: { name: "incremental", framework: "nextjs" },
      completedSteps: ["init"],
    };
    await writeJson(configPath, config);

    // Step 2: Add stripe
    const loaded = await readJson<any>(configPath);
    loaded.stripe = {
      products: [{ id: "prod_1", name: "Pro", priceId: "price_1", amount: 2999, interval: "month" }],
      portalConfigured: false,
      taxEnabled: false,
    };
    loaded.completedSteps.push("stripe");
    await writeJson(configPath, loaded);

    // Step 3: Add db
    const loaded2 = await readJson<any>(configPath);
    loaded2.db = { provider: "neon", connectionStringEnvVar: "DATABASE_URL" };
    loaded2.completedSteps.push("db");
    await writeJson(configPath, loaded2);

    // Verify final state
    const final = await readJson(configPath);
    const parsed = saasConfigSchema.parse(migrateConfig(final));

    expect(parsed.completedSteps).toEqual(["init", "stripe", "db"]);
    expect(parsed.stripe?.products).toHaveLength(1);
    expect(parsed.db?.provider).toBe("neon");
  });

  it("preserves unknown extra fields through write/read cycle", async () => {
    const configPath = join(tmpDir, "extra.json");
    const configWithExtras = {
      version: 2,
      project: { name: "extras", framework: "nextjs" },
      completedSteps: [],
      _custom: "user-defined",
    };

    await writeJson(configPath, configWithExtras);
    const raw = await readJson<any>(configPath);
    expect(raw._custom).toBe("user-defined");
  });

  it("handles markStepCompleted idempotency pattern", async () => {
    const configPath = join(tmpDir, "saas.config.json");
    const config: any = {
      version: 2,
      project: { name: "idempotent", framework: "nextjs" },
      completedSteps: [],
    };

    await writeJson(configPath, config);

    // Simulate markStepCompleted
    const loaded = await readJson<any>(configPath);
    if (!loaded.completedSteps.includes("stripe")) {
      loaded.completedSteps.push("stripe");
    }
    await writeJson(configPath, loaded);

    // Call again — should not duplicate
    const loaded2 = await readJson<any>(configPath);
    if (!loaded2.completedSteps.includes("stripe")) {
      loaded2.completedSteps.push("stripe");
    }
    await writeJson(configPath, loaded2);

    const final = await readJson<any>(configPath);
    const stripeCount = final.completedSteps.filter((s: string) => s === "stripe").length;
    expect(stripeCount).toBe(1);
  });
});
