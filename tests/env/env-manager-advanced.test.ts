import { describe, it, expect } from "vitest";
import { EnvManager } from "../../src/env/manager.js";

describe("EnvManager — advanced scenarios", () => {
  it("handles large number of env vars", () => {
    const mgr = new EnvManager();
    for (let i = 0; i < 100; i++) {
      mgr.add({
        key: `VAR_${i}`,
        value: `value_${i}`,
        source: `source_${i % 5}`,
        sensitive: i % 3 === 0,
        scopes: ["development"],
      });
    }
    expect(mgr.getAll()).toHaveLength(100);
    expect(mgr.getSources()).toHaveLength(5);
  });

  it("generateDotEnv respects scope filtering", () => {
    const mgr = new EnvManager();
    mgr.add({
      key: "DEV_ONLY",
      value: "dev",
      source: "test",
      sensitive: false,
      scopes: ["development"],
    });
    mgr.add({
      key: "PROD_ONLY",
      value: "prod",
      source: "test",
      sensitive: false,
      scopes: ["production"],
    });
    mgr.add({
      key: "ALL_SCOPES",
      value: "everywhere",
      source: "test",
      sensitive: false,
      scopes: ["development", "preview", "production"],
    });

    const devEnv = mgr.generateDotEnv("development");
    expect(devEnv).toContain("DEV_ONLY=dev");
    expect(devEnv).toContain("ALL_SCOPES=everywhere");
    expect(devEnv).not.toContain("PROD_ONLY");

    const prodEnv = mgr.generateDotEnv("production");
    expect(prodEnv).toContain("PROD_ONLY=prod");
    expect(prodEnv).toContain("ALL_SCOPES=everywhere");
    expect(prodEnv).not.toContain("DEV_ONLY");

    const previewEnv = mgr.generateDotEnv("preview");
    expect(previewEnv).toContain("ALL_SCOPES=everywhere");
    expect(previewEnv).not.toContain("DEV_ONLY");
    expect(previewEnv).not.toContain("PROD_ONLY");
  });

  it("generateDotEnv adds source headers", () => {
    const mgr = new EnvManager();
    mgr.addMany({ KEY_A: "a" }, "stripe");
    mgr.addMany({ KEY_B: "b" }, "database");
    mgr.addMany({ KEY_C: "c" }, "auth");

    const output = mgr.generateDotEnv();
    expect(output).toContain("# === Auth ===");
    expect(output).toContain("# === Database ===");
    expect(output).toContain("# === Stripe ===");
  });

  it("generateDotEnv ends with newline", () => {
    const mgr = new EnvManager();
    mgr.addMany({ KEY: "value" }, "source");
    const output = mgr.generateDotEnv();
    expect(output.endsWith("\n")).toBe(true);
  });

  it("generateDotEnvExample strips sensitive values", () => {
    const mgr = new EnvManager();
    mgr.add({
      key: "STRIPE_SECRET_KEY",
      value: "sk_test_verysecret123",
      source: "stripe",
      sensitive: true,
      scopes: ["development"],
    });
    mgr.add({
      key: "NEXT_PUBLIC_APP_URL",
      value: "http://localhost:3000",
      source: "app",
      sensitive: false,
      scopes: ["development"],
    });

    const example = mgr.generateDotEnvExample();
    expect(example).not.toContain("sk_test_verysecret123");
    expect(example).toContain("STRIPE_SECRET_KEY=");
    expect(example).toContain("NEXT_PUBLIC_APP_URL=http://localhost:3000");
  });

  it("generateDotEnvExample includes descriptions", () => {
    const mgr = new EnvManager();
    mgr.add({
      key: "API_KEY",
      value: "secret",
      source: "test",
      sensitive: true,
      scopes: ["development"],
      description: "Your API key from the dashboard",
    });

    const example = mgr.generateDotEnvExample();
    expect(example).toContain("# Your API key from the dashboard");
  });

  it("generateDotEnvExample has header comment", () => {
    const mgr = new EnvManager();
    mgr.addMany({ KEY: "val" }, "test");

    const example = mgr.generateDotEnvExample();
    expect(example).toContain("# Environment variables");
    expect(example).toContain(".env.local");
  });

  it("addMany detects SECRET in key name as sensitive", () => {
    const mgr = new EnvManager();
    mgr.addMany({ MY_SECRET: "hidden" }, "test");
    const v = mgr.getAll().find((v) => v.key === "MY_SECRET");
    expect(v?.sensitive).toBe(true);
  });

  it("addMany detects TOKEN in key name as sensitive", () => {
    const mgr = new EnvManager();
    mgr.addMany({ AUTH_TOKEN: "tok123" }, "test");
    const v = mgr.getAll().find((v) => v.key === "AUTH_TOKEN");
    expect(v?.sensitive).toBe(true);
  });

  it("addMany detects PASSWORD in key name as sensitive", () => {
    const mgr = new EnvManager();
    mgr.addMany({ DB_PASSWORD: "pw" }, "test");
    const v = mgr.getAll().find((v) => v.key === "DB_PASSWORD");
    expect(v?.sensitive).toBe(true);
  });

  it("addMany detects URL in key name as sensitive", () => {
    const mgr = new EnvManager();
    mgr.addMany({ DATABASE_URL: "postgres://..." }, "test");
    const v = mgr.getAll().find((v) => v.key === "DATABASE_URL");
    expect(v?.sensitive).toBe(true);
  });

  it("addMany detects KEY in key name as sensitive", () => {
    const mgr = new EnvManager();
    mgr.addMany({ STRIPE_KEY: "sk_123" }, "test");
    const v = mgr.getAll().find((v) => v.key === "STRIPE_KEY");
    expect(v?.sensitive).toBe(true);
  });

  it("addMany marks non-secret keys as not sensitive", () => {
    const mgr = new EnvManager();
    mgr.addMany({ APP_NAME: "myapp", NEXT_PUBLIC_SITE_TITLE: "My App" }, "test");
    const name = mgr.getAll().find((v) => v.key === "APP_NAME");
    const title = mgr.getAll().find((v) => v.key === "NEXT_PUBLIC_SITE_TITLE");
    expect(name?.sensitive).toBe(false);
    expect(title?.sensitive).toBe(false);
  });

  it("addMany override sensitive flag", () => {
    const mgr = new EnvManager();
    mgr.addMany({ NOT_SECRET: "value" }, "test", { sensitive: true });
    const v = mgr.getAll().find((v) => v.key === "NOT_SECRET");
    expect(v?.sensitive).toBe(true);
  });

  it("addMany custom scopes", () => {
    const mgr = new EnvManager();
    mgr.addMany({ KEY: "val" }, "test", { scopes: ["production"] });
    const v = mgr.getAll().find((v) => v.key === "KEY");
    expect(v?.scopes).toEqual(["production"]);
  });

  it("getForScope returns empty for no matching vars", () => {
    const mgr = new EnvManager();
    mgr.add({
      key: "DEV",
      value: "only-dev",
      source: "test",
      sensitive: false,
      scopes: ["development"],
    });
    expect(mgr.getForScope("production")).toEqual({});
  });

  it("last value wins for same key in getForScope", () => {
    const mgr = new EnvManager();
    mgr.add({
      key: "SHARED_KEY",
      value: "from-stripe",
      source: "stripe",
      sensitive: false,
      scopes: ["development"],
    });
    mgr.add({
      key: "SHARED_KEY",
      value: "from-auth",
      source: "auth",
      sensitive: false,
      scopes: ["development"],
    });

    const result = mgr.getForScope("development");
    // Both exist in getAll, but getForScope overwrites keys
    expect(result["SHARED_KEY"]).toBe("from-auth");
  });

  it("empty manager generates minimal dotenv", () => {
    const mgr = new EnvManager();
    const output = mgr.generateDotEnv();
    expect(output).toBe("\n");
  });

  it("empty manager has no sources", () => {
    const mgr = new EnvManager();
    expect(mgr.getSources()).toEqual([]);
  });

  it("simulates real-world SaaS env var collection", () => {
    const mgr = new EnvManager();

    // Stripe
    mgr.addMany({
      STRIPE_SECRET_KEY: "sk_test_abc123",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc123",
      STRIPE_WEBHOOK_SECRET: "whsec_abc123",
    }, "stripe");

    // Database
    mgr.addMany({
      DATABASE_URL: "postgresql://user:pass@db.neon.tech:5432/neondb",
    }, "database");

    // Auth
    mgr.addMany({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_clerk123",
      CLERK_SECRET_KEY: "sk_test_clerk123",
    }, "auth");

    // Email
    mgr.addMany({
      RESEND_API_KEY: "re_abc123",
    }, "email");

    // Monitoring
    mgr.addMany({
      NEXT_PUBLIC_SENTRY_DSN: "https://abc@sentry.io/123",
      SENTRY_AUTH_TOKEN: "sntrys_abc123",
      NEXT_PUBLIC_POSTHOG_KEY: "phc_abc123",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
    }, "monitoring");

    expect(mgr.getAll()).toHaveLength(11);
    expect(mgr.getSources().sort()).toEqual(["auth", "database", "email", "monitoring", "stripe"]);

    const devEnv = mgr.generateDotEnv("development");
    expect(devEnv).toContain("STRIPE_SECRET_KEY=sk_test_abc123");
    expect(devEnv).toContain("DATABASE_URL=");
    expect(devEnv).toContain("CLERK_SECRET_KEY=");
    expect(devEnv).toContain("RESEND_API_KEY=");
    expect(devEnv).toContain("NEXT_PUBLIC_SENTRY_DSN=");
    expect(devEnv).toContain("NEXT_PUBLIC_POSTHOG_KEY=");

    const example = mgr.generateDotEnvExample();
    expect(example).not.toContain("sk_test_abc123");
    expect(example).not.toContain("sk_test_clerk123");
    expect(example).not.toContain("re_abc123");
    // Non-sensitive NEXT_PUBLIC vars that contain KEY should still be redacted
    expect(example).toContain("NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com");
  });
});
