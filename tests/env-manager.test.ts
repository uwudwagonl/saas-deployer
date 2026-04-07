import { describe, it, expect } from "vitest";
import { EnvManager } from "../src/env/manager.js";

describe("EnvManager", () => {
  it("adds and retrieves env vars", () => {
    const mgr = new EnvManager();
    mgr.add({
      key: "DB_URL",
      value: "postgres://localhost",
      source: "database",
      sensitive: true,
      scopes: ["development", "preview", "production"],
    });

    const all = mgr.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].key).toBe("DB_URL");
  });

  it("replaces existing var with same key and source", () => {
    const mgr = new EnvManager();
    mgr.add({
      key: "DB_URL",
      value: "old",
      source: "database",
      sensitive: true,
      scopes: ["development"],
    });
    mgr.add({
      key: "DB_URL",
      value: "new",
      source: "database",
      sensitive: true,
      scopes: ["development"],
    });

    const all = mgr.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].value).toBe("new");
  });

  it("keeps vars from different sources with same key", () => {
    const mgr = new EnvManager();
    mgr.add({
      key: "API_KEY",
      value: "stripe-key",
      source: "stripe",
      sensitive: true,
      scopes: ["development"],
    });
    mgr.add({
      key: "API_KEY",
      value: "resend-key",
      source: "email",
      sensitive: true,
      scopes: ["development"],
    });

    expect(mgr.getAll()).toHaveLength(2);
  });

  it("addMany auto-detects sensitive keys", () => {
    const mgr = new EnvManager();
    mgr.addMany(
      { STRIPE_SECRET_KEY: "sk_test_123", APP_NAME: "myapp" },
      "stripe"
    );

    const all = mgr.getAll();
    const secret = all.find((v) => v.key === "STRIPE_SECRET_KEY");
    const name = all.find((v) => v.key === "APP_NAME");
    expect(secret?.sensitive).toBe(true);
    expect(name?.sensitive).toBe(false);
  });

  it("getForScope filters by scope", () => {
    const mgr = new EnvManager();
    mgr.add({
      key: "DEV_ONLY",
      value: "dev",
      source: "test",
      sensitive: false,
      scopes: ["development"],
    });
    mgr.add({
      key: "ALL_SCOPES",
      value: "all",
      source: "test",
      sensitive: false,
      scopes: ["development", "preview", "production"],
    });

    const prod = mgr.getForScope("production");
    expect(prod).toEqual({ ALL_SCOPES: "all" });

    const dev = mgr.getForScope("development");
    expect(dev).toEqual({ DEV_ONLY: "dev", ALL_SCOPES: "all" });
  });

  it("generateDotEnv groups by source", () => {
    const mgr = new EnvManager();
    mgr.addMany({ STRIPE_KEY: "sk_123" }, "stripe");
    mgr.addMany({ DB_URL: "postgres://..." }, "database");

    const output = mgr.generateDotEnv("development");
    expect(output).toContain("# === Database ===");
    expect(output).toContain("# === Stripe ===");
    expect(output).toContain("DB_URL=postgres://...");
    expect(output).toContain("STRIPE_KEY=sk_123");
  });

  it("generateDotEnvExample redacts sensitive values", () => {
    const mgr = new EnvManager();
    mgr.add({
      key: "SECRET_KEY",
      value: "super-secret",
      source: "auth",
      sensitive: true,
      scopes: ["development"],
    });
    mgr.add({
      key: "APP_NAME",
      value: "myapp",
      source: "auth",
      sensitive: false,
      scopes: ["development"],
    });

    const output = mgr.generateDotEnvExample();
    expect(output).toContain("SECRET_KEY=");
    expect(output).not.toContain("super-secret");
    expect(output).toContain("APP_NAME=myapp");
  });

  it("getSources returns unique sources", () => {
    const mgr = new EnvManager();
    mgr.addMany({ A: "1", B: "2" }, "stripe");
    mgr.addMany({ C: "3" }, "database");

    expect(mgr.getSources().sort()).toEqual(["database", "stripe"]);
  });
});
