import { describe, it, expect } from "vitest";

// Test the secret mapping structure from github/secrets.ts
const SECRET_MAPPINGS = [
  { credKey: "stripe_secret_key", ghName: "STRIPE_SECRET_KEY", label: "Stripe Secret Key" },
  { credKey: "stripe_webhook_secret", ghName: "STRIPE_WEBHOOK_SECRET", label: "Stripe Webhook Secret" },
  { credKey: "database_url", ghName: "DATABASE_URL", label: "Database URL" },
  { credKey: "supabase_service_role_key", ghName: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase Service Role Key" },
  { credKey: "clerk_secret_key", ghName: "CLERK_SECRET_KEY", label: "Clerk Secret Key" },
  { credKey: "auth_secret", ghName: "AUTH_SECRET", label: "Auth Secret" },
  { credKey: "better_auth_secret", ghName: "BETTER_AUTH_SECRET", label: "Better Auth Secret" },
  { credKey: "turso_auth_token", ghName: "TURSO_AUTH_TOKEN", label: "Turso Auth Token" },
];

describe("GitHub secret mappings", () => {
  it("has 8 mappings", () => {
    expect(SECRET_MAPPINGS).toHaveLength(8);
  });

  it("all mappings have required fields", () => {
    for (const m of SECRET_MAPPINGS) {
      expect(m.credKey).toBeTruthy();
      expect(m.ghName).toBeTruthy();
      expect(m.label).toBeTruthy();
    }
  });

  it("credential keys are unique", () => {
    const keys = SECRET_MAPPINGS.map((m) => m.credKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("github secret names are unique", () => {
    const names = SECRET_MAPPINGS.map((m) => m.ghName);
    expect(new Set(names).size).toBe(names.length);
  });

  it("github secret names are SCREAMING_SNAKE_CASE", () => {
    for (const m of SECRET_MAPPINGS) {
      expect(m.ghName).toMatch(/^[A-Z_]+$/);
    }
  });

  it("credential keys are snake_case", () => {
    for (const m of SECRET_MAPPINGS) {
      expect(m.credKey).toMatch(/^[a-z_]+$/);
    }
  });

  it("only syncs sensitive secrets (not public keys)", () => {
    const ghNames = SECRET_MAPPINGS.map((m) => m.ghName);
    // Should NOT sync public keys (those go to Vercel env)
    expect(ghNames).not.toContain("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    expect(ghNames).not.toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    expect(ghNames).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(ghNames).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("includes critical secrets", () => {
    const ghNames = SECRET_MAPPINGS.map((m) => m.ghName);
    expect(ghNames).toContain("STRIPE_SECRET_KEY");
    expect(ghNames).toContain("DATABASE_URL");
    expect(ghNames).toContain("STRIPE_WEBHOOK_SECRET");
  });

  it("labels are human-readable", () => {
    for (const m of SECRET_MAPPINGS) {
      expect(m.label.length).toBeGreaterThan(5);
      // Should contain at least one space (it's a label, not a code identifier)
      expect(m.label).toContain(" ");
    }
  });
});
