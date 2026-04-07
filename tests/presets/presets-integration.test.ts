import { describe, it, expect } from "vitest";
import { PRESETS, getPreset } from "../../src/presets/index.js";
import { saasConfigSchema } from "../../src/config/schema.js";

/**
 * Tests that preset defaults produce valid configs when merged
 */
describe("preset defaults produce valid configs", () => {
  for (const [name, preset] of Object.entries(PRESETS)) {
    it(`"${name}" preset defaults merge into a valid config`, () => {
      const baseConfig = {
        version: 2 as const,
        project: {
          name: "test-project",
          framework: "nextjs" as const,
          preset: name as "minimal" | "startup" | "enterprise" | "custom",
        },
        completedSteps: ["init"],
      };

      const merged = { ...baseConfig, ...preset.defaults };
      const result = saasConfigSchema.safeParse(merged);
      expect(result.success).toBe(true);
    });
  }
});

describe("preset service lists match available commands", () => {
  const validServices = ["stripe", "db", "auth", "email", "monitoring", "github", "vercel", "domain"];

  for (const [name, preset] of Object.entries(PRESETS)) {
    it(`"${name}" services are all valid`, () => {
      for (const svc of preset.services) {
        expect(validServices).toContain(svc);
      }
    });
  }
});

describe("preset escalation", () => {
  it("minimal is a subset of startup", () => {
    const minimal = getPreset("minimal")!;
    const startup = getPreset("startup")!;
    for (const svc of minimal.services) {
      expect(startup.services).toContain(svc);
    }
  });

  it("startup is a subset of enterprise", () => {
    const startup = getPreset("startup")!;
    const enterprise = getPreset("enterprise")!;
    for (const svc of startup.services) {
      expect(enterprise.services).toContain(svc);
    }
  });

  it("enterprise has more services than startup", () => {
    const startup = getPreset("startup")!;
    const enterprise = getPreset("enterprise")!;
    expect(enterprise.services.length).toBeGreaterThan(startup.services.length);
  });

  it("startup has more services than minimal", () => {
    const minimal = getPreset("minimal")!;
    const startup = getPreset("startup")!;
    expect(startup.services.length).toBeGreaterThan(minimal.services.length);
  });
});

describe("preset defaults specifics", () => {
  it("minimal defaults to nextauth", () => {
    const minimal = getPreset("minimal")!;
    expect(minimal.defaults.auth?.provider).toBe("nextauth");
  });

  it("startup defaults to supabase + clerk + resend", () => {
    const startup = getPreset("startup")!;
    expect(startup.defaults.db?.provider).toBe("supabase");
    expect(startup.defaults.auth?.provider).toBe("clerk");
    expect(startup.defaults.email?.provider).toBe("resend");
  });

  it("enterprise defaults to neon + clerk + resend", () => {
    const enterprise = getPreset("enterprise")!;
    expect(enterprise.defaults.db?.provider).toBe("neon");
    expect(enterprise.defaults.auth?.provider).toBe("clerk");
    expect(enterprise.defaults.email?.provider).toBe("resend");
  });

  it("enterprise includes monitoring in services", () => {
    const enterprise = getPreset("enterprise")!;
    expect(enterprise.services).toContain("monitoring");
  });

  it("enterprise includes domain in services", () => {
    const enterprise = getPreset("enterprise")!;
    expect(enterprise.services).toContain("domain");
  });

  it("minimal does NOT include github or vercel", () => {
    const minimal = getPreset("minimal")!;
    expect(minimal.services).not.toContain("github");
    expect(minimal.services).not.toContain("vercel");
  });

  it("all presets include stripe", () => {
    for (const preset of Object.values(PRESETS)) {
      expect(preset.services).toContain("stripe");
    }
  });

  it("all presets include db", () => {
    for (const preset of Object.values(PRESETS)) {
      expect(preset.services).toContain("db");
    }
  });

  it("all presets include auth", () => {
    for (const preset of Object.values(PRESETS)) {
      expect(preset.services).toContain("auth");
    }
  });
});
