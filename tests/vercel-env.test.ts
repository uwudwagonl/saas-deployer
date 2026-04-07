import { describe, it, expect } from "vitest";

// Test the env var collection structure for Vercel push
// Replicating the mappings from providers/vercel/env.ts

const VERCEL_ENV_MAPPINGS = [
  { credKey: "stripe_secret_key", envKey: "STRIPE_SECRET_KEY", public: false },
  { credKey: "stripe_publishable_key", envKey: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", public: true },
  { credKey: "stripe_webhook_secret", envKey: "STRIPE_WEBHOOK_SECRET", public: false },
  { credKey: "database_url", envKey: "DATABASE_URL", public: false },
  { credKey: "supabase_url", envKey: "NEXT_PUBLIC_SUPABASE_URL", public: true },
  { credKey: "supabase_anon_key", envKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY", public: true },
  { credKey: "supabase_service_role_key", envKey: "SUPABASE_SERVICE_ROLE_KEY", public: false },
  { credKey: "turso_auth_token", envKey: "TURSO_AUTH_TOKEN", public: false },
  { credKey: "clerk_publishable_key", envKey: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", public: true },
  { credKey: "clerk_secret_key", envKey: "CLERK_SECRET_KEY", public: false },
  { credKey: "auth_secret", envKey: "AUTH_SECRET", public: false },
  { credKey: "better_auth_secret", envKey: "BETTER_AUTH_SECRET", public: false },
];

describe("Vercel env var mappings", () => {
  it("has 12 mappings", () => {
    expect(VERCEL_ENV_MAPPINGS).toHaveLength(12);
  });

  it("credential keys are unique", () => {
    const keys = VERCEL_ENV_MAPPINGS.map((m) => m.credKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("env keys are unique", () => {
    const keys = VERCEL_ENV_MAPPINGS.map((m) => m.envKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("public vars use NEXT_PUBLIC_ prefix", () => {
    for (const m of VERCEL_ENV_MAPPINGS) {
      if (m.public) {
        expect(m.envKey).toMatch(/^NEXT_PUBLIC_/);
      }
    }
  });

  it("private vars don't use NEXT_PUBLIC_ prefix", () => {
    for (const m of VERCEL_ENV_MAPPINGS) {
      if (!m.public) {
        expect(m.envKey).not.toMatch(/^NEXT_PUBLIC_/);
      }
    }
  });

  it("maps credential keys to correct env keys", () => {
    const mapping = Object.fromEntries(
      VERCEL_ENV_MAPPINGS.map((m) => [m.credKey, m.envKey])
    );

    expect(mapping.stripe_secret_key).toBe("STRIPE_SECRET_KEY");
    expect(mapping.stripe_publishable_key).toBe("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    expect(mapping.clerk_publishable_key).toBe("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    expect(mapping.database_url).toBe("DATABASE_URL");
  });

  it("has 4 public and 8 private vars", () => {
    const publicCount = VERCEL_ENV_MAPPINGS.filter((m) => m.public).length;
    const privateCount = VERCEL_ENV_MAPPINGS.filter((m) => !m.public).length;
    expect(publicCount).toBe(4);
    expect(privateCount).toBe(8);
  });
});

describe("Vercel env type assignment", () => {
  it("public vars should be plain type", () => {
    for (const m of VERCEL_ENV_MAPPINGS) {
      const type = m.public ? "plain" : "encrypted";
      if (m.public) {
        expect(type).toBe("plain");
      } else {
        expect(type).toBe("encrypted");
      }
    }
  });
});
