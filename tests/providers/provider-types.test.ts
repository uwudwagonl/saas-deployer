import { describe, it, expect } from "vitest";
import { stripeProvider } from "../../src/providers/stripe/index.js";
import { databaseProvider } from "../../src/providers/db/index.js";
import { authProvider } from "../../src/providers/auth/index.js";
import { githubProvider } from "../../src/providers/github/index.js";
import { vercelProvider } from "../../src/providers/vercel/index.js";
import { emailProvider } from "../../src/providers/email/index.js";
import { monitoringProvider } from "../../src/providers/monitoring/index.js";
import type { Provider } from "../../src/providers/types.js";

const ALL_PROVIDERS: Provider[] = [
  stripeProvider,
  databaseProvider,
  authProvider,
  githubProvider,
  vercelProvider,
  emailProvider,
  monitoringProvider,
];

describe("all providers implement Provider interface", () => {
  for (const provider of ALL_PROVIDERS) {
    describe(provider.name, () => {
      it("has a non-empty name", () => {
        expect(provider.name).toBeTruthy();
        expect(typeof provider.name).toBe("string");
      });

      it("has a non-empty displayName", () => {
        expect(provider.displayName).toBeTruthy();
        expect(typeof provider.displayName).toBe("string");
      });

      it("has a non-empty description", () => {
        expect(provider.description).toBeTruthy();
        expect(typeof provider.description).toBe("string");
      });

      it("has a valid category", () => {
        const validCategories = [
          "payments", "database", "auth", "hosting",
          "email", "monitoring", "analytics", "storage", "jobs",
        ];
        expect(validCategories).toContain(provider.category);
      });

      it("has requiredCredentialKeys array", () => {
        expect(Array.isArray(provider.requiredCredentialKeys)).toBe(true);
      });

      it("has dependsOn array", () => {
        expect(Array.isArray(provider.dependsOn)).toBe(true);
      });

      it("has a preflight function", () => {
        expect(typeof provider.preflight).toBe("function");
      });

      it("has a setup function", () => {
        expect(typeof provider.setup).toBe("function");
      });

      it("has no circular self-dependency", () => {
        expect(provider.dependsOn).not.toContain(provider.name);
      });
    });
  }
});

describe("provider names are unique", () => {
  it("no duplicate names", () => {
    const names = ALL_PROVIDERS.map((p) => p.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

describe("provider-specific properties", () => {
  it("stripe has CLI info", () => {
    expect(stripeProvider.cliName).toBe("stripe");
    expect(stripeProvider.loginCommand).toBe("stripe login");
    expect(stripeProvider.signupUrl).toBeTruthy();
  });

  it("stripe requires API keys", () => {
    expect(stripeProvider.requiredCredentialKeys).toContain("stripe_secret_key");
    expect(stripeProvider.requiredCredentialKeys).toContain("stripe_publishable_key");
  });

  it("stripe has no dependencies", () => {
    expect(stripeProvider.dependsOn).toEqual([]);
  });

  it("github has CLI info", () => {
    expect(githubProvider.cliName).toBe("gh");
    expect(githubProvider.loginCommand).toBe("gh auth login");
  });

  it("vercel has CLI info", () => {
    expect(vercelProvider.cliName).toBe("vercel");
    expect(vercelProvider.loginCommand).toBe("vercel login");
  });

  it("vercel requires token", () => {
    expect(vercelProvider.requiredCredentialKeys).toContain("vercel_token");
  });

  it("database has no dependencies", () => {
    expect(databaseProvider.dependsOn).toEqual([]);
  });

  it("auth has no dependencies", () => {
    expect(authProvider.dependsOn).toEqual([]);
  });

  it("email has no dependencies", () => {
    expect(emailProvider.dependsOn).toEqual([]);
  });

  it("monitoring has no dependencies", () => {
    expect(monitoringProvider.dependsOn).toEqual([]);
  });
});

describe("provider preflight returns correct structure", () => {
  const mockCtx = {
    config: {
      version: 2 as const,
      project: { name: "test", framework: "nextjs" as const },
      completedSteps: [],
    },
    credential: () => undefined,
    setCredential: () => {},
    interactive: true,
    dryRun: false,
  };

  for (const provider of ALL_PROVIDERS) {
    it(`${provider.name} preflight returns valid PreflightResult`, async () => {
      const result = await provider.preflight(mockCtx);

      expect(typeof result.ready).toBe("boolean");
      expect(Array.isArray(result.missingCredentials)).toBe(true);
      expect(Array.isArray(result.missingDependencies)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  }

  it("stripe preflight reports missing credentials", async () => {
    const result = await stripeProvider.preflight(mockCtx);
    expect(result.missingCredentials).toContain("stripe_secret_key");
    expect(result.missingCredentials).toContain("stripe_publishable_key");
  });

  it("stripe preflight is ready when credentials exist", async () => {
    const ctxWithCreds = {
      ...mockCtx,
      credential: (key: string) => {
        if (key === "stripe_secret_key") return "sk_test_abc";
        if (key === "stripe_publishable_key") return "pk_test_abc";
        return undefined;
      },
    };
    const result = await stripeProvider.preflight(ctxWithCreds);
    expect(result.ready).toBe(true);
    expect(result.missingCredentials).toEqual([]);
  });

  it("vercel preflight reports missing token", async () => {
    const result = await vercelProvider.preflight(mockCtx);
    expect(result.missingCredentials).toContain("vercel_token");
  });

  it("auth preflight warns about missing database", async () => {
    const result = await authProvider.preflight(mockCtx);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("database");
  });

  it("auth preflight does not warn for clerk", async () => {
    const ctxWithClerk = {
      ...mockCtx,
      config: {
        ...mockCtx.config,
        auth: { provider: "clerk" as const, configured: false },
      },
    };
    const result = await authProvider.preflight(ctxWithClerk);
    expect(result.warnings).toEqual([]);
  });
});
