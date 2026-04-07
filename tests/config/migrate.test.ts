import { describe, it, expect } from "vitest";
import { migrateConfig } from "../../src/config/migrate.js";

describe("migrateConfig", () => {
  it("passes through valid v2 config unchanged", () => {
    const config = { version: 2, project: { name: "test" }, completedSteps: [] };
    const result = migrateConfig(config) as any;
    expect(result.version).toBe(2);
    expect(result.project.name).toBe("test");
  });

  it("migrates v1 to v2", () => {
    const config = { version: 1, project: { name: "old" }, completedSteps: [] };
    const result = migrateConfig(config) as any;
    expect(result.version).toBe(2);
  });

  it("renames lucia to better-auth during v1→v2 migration", () => {
    const config = {
      version: 1,
      project: { name: "old" },
      auth: { provider: "lucia", configured: true },
      completedSteps: [],
    };
    const result = migrateConfig(config) as any;
    expect(result.auth.provider).toBe("better-auth");
  });

  it("leaves non-lucia auth providers unchanged", () => {
    const config = {
      version: 1,
      project: { name: "old" },
      auth: { provider: "clerk", configured: true },
      completedSteps: [],
    };
    const result = migrateConfig(config) as any;
    expect(result.auth.provider).toBe("clerk");
  });

  it("defaults missing version to 1 and migrates", () => {
    const config = { project: { name: "no-version" }, completedSteps: [] };
    const result = migrateConfig(config) as any;
    expect(result.version).toBe(2);
  });

  it("throws on non-object input", () => {
    expect(() => migrateConfig(null)).toThrow("Invalid config");
    expect(() => migrateConfig("string")).toThrow("Invalid config");
    expect(() => migrateConfig(42)).toThrow("Invalid config");
  });

  it("throws on unknown version", () => {
    expect(() => migrateConfig({ version: 99 })).toThrow("Unknown config version");
  });
});
