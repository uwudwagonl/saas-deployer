import { describe, it, expect } from "vitest";
import { EnvManager } from "../../src/env/manager.js";

/**
 * Tests simulating the collectEnvVars function from commands/env.ts
 * Tests the full env collection pipeline from multiple providers
 */
describe("env collection pipeline", () => {
  function simulateCollect(credentials: Record<string, string>): EnvManager {
    const cred = (key: string) => credentials[key];
    const mgr = new EnvManager();

    // Stripe
    const stripeSecret = cred("stripe_secret_key");
    const stripePk = cred("stripe_publishable_key");
    const stripeWebhookSecret = cred("stripe_webhook_secret");

    if (stripeSecret) {
      mgr.addMany(
        {
          STRIPE_SECRET_KEY: stripeSecret,
          ...(stripePk ? { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripePk } : {}),
          ...(stripeWebhookSecret ? { STRIPE_WEBHOOK_SECRET: stripeWebhookSecret } : {}),
        },
        "stripe"
      );
    }

    // Database
    const dbUrl = cred("database_url");
    if (dbUrl) mgr.addMany({ DATABASE_URL: dbUrl }, "database");

    // Supabase extras
    const supabaseUrl = cred("supabase_url");
    const supabaseAnon = cred("supabase_anon_key");
    const supabaseServiceRole = cred("supabase_service_role_key");
    if (supabaseUrl && supabaseAnon) {
      mgr.addMany(
        {
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon,
          ...(supabaseServiceRole ? { SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRole } : {}),
        },
        "supabase"
      );
    }

    // Turso
    const tursoAuth = cred("turso_auth_token");
    if (tursoAuth) mgr.addMany({ TURSO_AUTH_TOKEN: tursoAuth }, "turso");

    // Clerk
    const clerkPk = cred("clerk_publishable_key");
    const clerkSk = cred("clerk_secret_key");
    if (clerkPk && clerkSk) {
      mgr.addMany(
        { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPk, CLERK_SECRET_KEY: clerkSk },
        "clerk"
      );
    }

    // NextAuth
    const authSecret = cred("auth_secret");
    if (authSecret) mgr.addMany({ AUTH_SECRET: authSecret }, "nextauth");

    // Better Auth
    const betterAuthSecret = cred("better_auth_secret");
    if (betterAuthSecret) mgr.addMany({ BETTER_AUTH_SECRET: betterAuthSecret }, "better-auth");

    // Email
    const resendKey = cred("resend_api_key");
    if (resendKey) mgr.addMany({ RESEND_API_KEY: resendKey }, "email");

    const sendgridKey = cred("sendgrid_api_key");
    if (sendgridKey) mgr.addMany({ SENDGRID_API_KEY: sendgridKey }, "email");

    const postmarkToken = cred("postmark_server_token");
    if (postmarkToken) mgr.addMany({ POSTMARK_SERVER_TOKEN: postmarkToken }, "email");

    // Monitoring
    const sentryDsn = cred("sentry_dsn");
    if (sentryDsn) mgr.addMany({ NEXT_PUBLIC_SENTRY_DSN: sentryDsn }, "monitoring");

    const posthogKey = cred("posthog_key");
    if (posthogKey) mgr.addMany({ NEXT_PUBLIC_POSTHOG_KEY: posthogKey }, "monitoring");

    return mgr;
  }

  it("empty credentials produce empty env", () => {
    const mgr = simulateCollect({});
    expect(mgr.getAll()).toHaveLength(0);
  });

  it("stripe-only setup", () => {
    const mgr = simulateCollect({
      stripe_secret_key: "sk_test_123",
      stripe_publishable_key: "pk_test_123",
      stripe_webhook_secret: "whsec_123",
    });

    const env = mgr.getForScope("development");
    expect(env.STRIPE_SECRET_KEY).toBe("sk_test_123");
    expect(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBe("pk_test_123");
    expect(env.STRIPE_WEBHOOK_SECRET).toBe("whsec_123");
    expect(Object.keys(env)).toHaveLength(3);
  });

  it("stripe + neon + clerk stack", () => {
    const mgr = simulateCollect({
      stripe_secret_key: "sk_test_123",
      stripe_publishable_key: "pk_test_123",
      database_url: "postgresql://neon.tech/db",
      clerk_publishable_key: "pk_test_clerk",
      clerk_secret_key: "sk_test_clerk",
    });

    expect(mgr.getSources().sort()).toEqual(["clerk", "database", "stripe"]);
    const env = mgr.getForScope("production");
    expect(env.STRIPE_SECRET_KEY).toBeTruthy();
    expect(env.DATABASE_URL).toBeTruthy();
    expect(env.CLERK_SECRET_KEY).toBeTruthy();
  });

  it("supabase full stack (db + auth)", () => {
    const mgr = simulateCollect({
      database_url: "postgresql://postgres.ref:pw@pooler.supabase.com:6543/postgres",
      supabase_url: "https://ref.supabase.co",
      supabase_anon_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon",
      supabase_service_role_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service",
    });

    const env = mgr.getForScope("development");
    expect(env.DATABASE_URL).toContain("supabase");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://ref.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toContain("eyJ");
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toContain("eyJ");
  });

  it("turso stack", () => {
    const mgr = simulateCollect({
      database_url: "libsql://mydb-org.turso.io",
      turso_auth_token: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.turso",
    });

    const env = mgr.getForScope("development");
    expect(env.DATABASE_URL).toContain("turso");
    expect(env.TURSO_AUTH_TOKEN).toContain("turso");
    expect(mgr.getSources().sort()).toEqual(["database", "turso"]);
  });

  it("nextauth stack", () => {
    const mgr = simulateCollect({
      auth_secret: "abc123hexstring",
      database_url: "postgresql://...",
    });

    const env = mgr.getForScope("development");
    expect(env.AUTH_SECRET).toBe("abc123hexstring");
    expect(env.DATABASE_URL).toBeTruthy();
  });

  it("better-auth stack", () => {
    const mgr = simulateCollect({
      better_auth_secret: "betterhex123",
      database_url: "postgresql://...",
    });

    const env = mgr.getForScope("development");
    expect(env.BETTER_AUTH_SECRET).toBe("betterhex123");
  });

  it("full enterprise stack", () => {
    const mgr = simulateCollect({
      stripe_secret_key: "sk_test_123",
      stripe_publishable_key: "pk_test_123",
      stripe_webhook_secret: "whsec_123",
      database_url: "postgresql://neon/db",
      clerk_publishable_key: "pk_test_clerk",
      clerk_secret_key: "sk_test_clerk",
      resend_api_key: "re_123",
      sentry_dsn: "https://abc@sentry.io/123",
      posthog_key: "phc_abc123",
    });

    const sources = mgr.getSources().sort();
    expect(sources).toEqual(["clerk", "database", "email", "monitoring", "stripe"]);

    const all = mgr.getAll();
    expect(all.length).toBeGreaterThanOrEqual(9);

    // Generate .env.local
    const dotenv = mgr.generateDotEnv("development");
    expect(dotenv).toContain("STRIPE_SECRET_KEY=sk_test_123");
    expect(dotenv).toContain("DATABASE_URL=postgresql://neon/db");
    expect(dotenv).toContain("CLERK_SECRET_KEY=sk_test_clerk");
    expect(dotenv).toContain("RESEND_API_KEY=re_123");
    expect(dotenv).toContain("NEXT_PUBLIC_SENTRY_DSN=https://abc@sentry.io/123");

    // Generate .env.example
    const example = mgr.generateDotEnvExample();
    expect(example).not.toContain("sk_test_123");
    expect(example).not.toContain("sk_test_clerk");
    expect(example).not.toContain("re_123");
    expect(example).toContain("STRIPE_SECRET_KEY=");
    expect(example).toContain("CLERK_SECRET_KEY=");
  });

  it("email providers are mutually exclusive in practice", () => {
    const resend = simulateCollect({ resend_api_key: "re_123" });
    expect(resend.getAll().find((v) => v.key === "RESEND_API_KEY")).toBeTruthy();
    expect(resend.getAll().find((v) => v.key === "SENDGRID_API_KEY")).toBeUndefined();

    const sendgrid = simulateCollect({ sendgrid_api_key: "SG.abc" });
    expect(sendgrid.getAll().find((v) => v.key === "SENDGRID_API_KEY")).toBeTruthy();
    expect(sendgrid.getAll().find((v) => v.key === "RESEND_API_KEY")).toBeUndefined();

    const postmark = simulateCollect({ postmark_server_token: "tok123" });
    expect(postmark.getAll().find((v) => v.key === "POSTMARK_SERVER_TOKEN")).toBeTruthy();
  });

  it("partial stripe config (no webhook secret yet)", () => {
    const mgr = simulateCollect({
      stripe_secret_key: "sk_test_123",
      stripe_publishable_key: "pk_test_123",
    });

    const env = mgr.getForScope("development");
    expect(env.STRIPE_SECRET_KEY).toBeTruthy();
    expect(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBeTruthy();
    expect(env.STRIPE_WEBHOOK_SECRET).toBeUndefined();
  });

  it("supabase without service role key", () => {
    const mgr = simulateCollect({
      supabase_url: "https://ref.supabase.co",
      supabase_anon_key: "eyJ.anon",
    });

    const env = mgr.getForScope("development");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy();
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeTruthy();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });
});
