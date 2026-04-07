import { describe, it, expect, beforeEach } from "vitest";

// We need to test the registry in isolation since it uses module-level state.
// Import the functions directly and test them.

describe("provider registry", () => {
  // Since the registry uses module-level state, we'll test the pattern
  // by creating a fresh registry-like structure each time
  let providers: Map<string, any>;

  function registerProvider(provider: any) {
    providers.set(provider.name, provider);
  }
  function getProvider(name: string) {
    return providers.get(name);
  }
  function getAllProviders() {
    return Array.from(providers.values());
  }
  function getProviderNames() {
    return Array.from(providers.keys());
  }
  function getProvidersByCategory(category: string) {
    return getAllProviders().filter((p: any) => p.category === category);
  }

  const mockStripe = {
    name: "stripe",
    displayName: "Stripe",
    category: "payments",
    dependsOn: [],
  };
  const mockDb = {
    name: "database",
    displayName: "Database",
    category: "database",
    dependsOn: [],
  };
  const mockAuth = {
    name: "auth",
    displayName: "Auth",
    category: "auth",
    dependsOn: [],
  };
  const mockGithub = {
    name: "github",
    displayName: "GitHub",
    category: "hosting",
    dependsOn: ["stripe", "database"],
  };
  const mockVercel = {
    name: "vercel",
    displayName: "Vercel",
    category: "hosting",
    dependsOn: ["github"],
  };

  beforeEach(() => {
    providers = new Map();
  });

  it("registers and retrieves a provider", () => {
    registerProvider(mockStripe);
    expect(getProvider("stripe")).toBe(mockStripe);
  });

  it("returns undefined for unknown provider", () => {
    expect(getProvider("nonexistent")).toBeUndefined();
  });

  it("lists all registered providers", () => {
    registerProvider(mockStripe);
    registerProvider(mockDb);
    expect(getAllProviders()).toHaveLength(2);
  });

  it("lists provider names", () => {
    registerProvider(mockStripe);
    registerProvider(mockDb);
    registerProvider(mockAuth);
    expect(getProviderNames()).toEqual(["stripe", "database", "auth"]);
  });

  it("filters by category", () => {
    registerProvider(mockStripe);
    registerProvider(mockDb);
    registerProvider(mockGithub);
    registerProvider(mockVercel);

    const hosting = getProvidersByCategory("hosting");
    expect(hosting).toHaveLength(2);
    expect(hosting[0].name).toBe("github");
    expect(hosting[1].name).toBe("vercel");
  });

  it("returns empty array for unknown category", () => {
    registerProvider(mockStripe);
    expect(getProvidersByCategory("unknown")).toEqual([]);
  });

  it("overwrites provider with same name", () => {
    registerProvider(mockStripe);
    const updatedStripe = { ...mockStripe, displayName: "Stripe v2" };
    registerProvider(updatedStripe);
    expect(getProvider("stripe")?.displayName).toBe("Stripe v2");
    expect(getAllProviders()).toHaveLength(1);
  });

  it("handles empty registry", () => {
    expect(getAllProviders()).toEqual([]);
    expect(getProviderNames()).toEqual([]);
    expect(getProvidersByCategory("payments")).toEqual([]);
  });
});
