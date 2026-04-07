import { describe, it, expect } from "vitest";
import { getPreset, getPresetNames, PRESETS } from "../../src/presets/index.js";

describe("presets", () => {
  it("has three presets", () => {
    expect(getPresetNames()).toEqual(["minimal", "startup", "enterprise"]);
  });

  it("getPreset returns correct preset", () => {
    const startup = getPreset("startup");
    expect(startup).toBeDefined();
    expect(startup!.name).toBe("startup");
    expect(startup!.services).toContain("stripe");
    expect(startup!.services).toContain("db");
  });

  it("getPreset returns undefined for unknown preset", () => {
    expect(getPreset("nonexistent")).toBeUndefined();
  });

  it("minimal preset has essential services", () => {
    const minimal = PRESETS.minimal;
    expect(minimal.services).toEqual(["stripe", "db", "auth"]);
  });

  it("enterprise preset includes monitoring", () => {
    const enterprise = PRESETS.enterprise;
    expect(enterprise.services).toContain("monitoring");
    expect(enterprise.services).toContain("email");
  });

  it("all presets have required fields", () => {
    for (const preset of Object.values(PRESETS)) {
      expect(preset.name).toBeTruthy();
      expect(preset.displayName).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.services.length).toBeGreaterThan(0);
    }
  });
});
