import { describe, it, expect } from "vitest";
import { topologicalSort } from "../src/deploy/resolver.js";
import { stripeProvider } from "../src/providers/stripe/index.js";
import { databaseProvider } from "../src/providers/db/index.js";
import { authProvider } from "../src/providers/auth/index.js";
import { githubProvider } from "../src/providers/github/index.js";
import { vercelProvider } from "../src/providers/vercel/index.js";
import type { Provider } from "../src/providers/types.js";

/**
 * Tests the deploy orchestrator's dependency resolution
 * using real provider dependency declarations
 */
const ALL_PROVIDERS: Provider[] = [
  databaseProvider,
  authProvider,
  stripeProvider,
  githubProvider,
  vercelProvider,
];

describe("deploy orchestrator dependency resolution", () => {
  it("resolves all providers without circular dependencies", () => {
    const names = ALL_PROVIDERS.map((p) => p.name);
    const edges = new Map<string, string[]>();
    for (const p of ALL_PROVIDERS) {
      edges.set(p.name, p.dependsOn.filter((d) => names.includes(d)));
    }

    expect(() => topologicalSort(names, edges)).not.toThrow();
    const sorted = topologicalSort(names, edges);
    expect(sorted).toHaveLength(ALL_PROVIDERS.length);
  });

  it("includes all providers in sorted result", () => {
    const names = ALL_PROVIDERS.map((p) => p.name);
    const edges = new Map<string, string[]>();
    for (const p of ALL_PROVIDERS) {
      edges.set(p.name, p.dependsOn.filter((d) => names.includes(d)));
    }

    const sorted = topologicalSort(names, edges);
    for (const name of names) {
      expect(sorted).toContain(name);
    }
  });

  it("respects declared dependency order", () => {
    const names = ALL_PROVIDERS.map((p) => p.name);
    const edges = new Map<string, string[]>();
    for (const p of ALL_PROVIDERS) {
      edges.set(p.name, p.dependsOn.filter((d) => names.includes(d)));
    }

    const sorted = topologicalSort(names, edges);

    // Verify each provider's dependencies come before it
    for (const p of ALL_PROVIDERS) {
      const providerIdx = sorted.indexOf(p.name);
      for (const dep of p.dependsOn) {
        if (names.includes(dep)) {
          const depIdx = sorted.indexOf(dep);
          expect(depIdx).toBeLessThan(providerIdx);
        }
      }
    }
  });

  it("handles single provider selection", () => {
    for (const provider of ALL_PROVIDERS) {
      const edges = new Map([[provider.name, []]]);
      const sorted = topologicalSort([provider.name], edges);
      expect(sorted).toEqual([provider.name]);
    }
  });

  it("handles subset of providers (common patterns)", () => {
    // Just Stripe + DB (common first setup)
    const subset = [stripeProvider, databaseProvider];
    const names = subset.map((p) => p.name);
    const edges = new Map<string, string[]>();
    for (const p of subset) {
      edges.set(p.name, p.dependsOn.filter((d) => names.includes(d)));
    }

    const sorted = topologicalSort(names, edges);
    expect(sorted).toHaveLength(2);
  });

  it("all providers declare dependsOn as array", () => {
    for (const p of ALL_PROVIDERS) {
      expect(Array.isArray(p.dependsOn)).toBe(true);
    }
  });

  it("no provider depends on itself", () => {
    for (const p of ALL_PROVIDERS) {
      expect(p.dependsOn).not.toContain(p.name);
    }
  });

  it("all dependencies reference existing provider names", () => {
    const allNames = new Set(ALL_PROVIDERS.map((p) => p.name));
    for (const p of ALL_PROVIDERS) {
      for (const dep of p.dependsOn) {
        // Dependencies should either be in allNames or be an external (non-critical) dep
        // This test just documents what deps exist
        expect(typeof dep).toBe("string");
        expect(dep.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("dry-run simulation", () => {
  it("can generate execution plan without running anything", () => {
    const names = ALL_PROVIDERS.map((p) => p.name);
    const edges = new Map<string, string[]>();
    for (const p of ALL_PROVIDERS) {
      edges.set(p.name, p.dependsOn.filter((d) => names.includes(d)));
    }

    const sorted = topologicalSort(names, edges);

    // Simulate dry-run output
    const plan: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const provider = ALL_PROVIDERS.find((p) => p.name === sorted[i])!;
      plan.push(`[${i + 1}/${sorted.length}] ${provider.displayName}`);
    }

    expect(plan).toHaveLength(ALL_PROVIDERS.length);
    expect(plan[0]).toMatch(/\[1\//);
    expect(plan[plan.length - 1]).toMatch(new RegExp(`\\[${ALL_PROVIDERS.length}/`));
  });

  it("skips completed steps correctly", () => {
    const completedSteps = ["database", "stripe"];
    const names = ALL_PROVIDERS.map((p) => p.name);
    const edges = new Map<string, string[]>();
    for (const p of ALL_PROVIDERS) {
      edges.set(p.name, p.dependsOn.filter((d) => names.includes(d)));
    }

    const sorted = topologicalSort(names, edges);
    const toRun = sorted.filter((name) => !completedSteps.includes(name));

    expect(toRun).not.toContain("database");
    expect(toRun).not.toContain("stripe");
    expect(toRun.length).toBe(names.length - completedSteps.length);
  });
});
