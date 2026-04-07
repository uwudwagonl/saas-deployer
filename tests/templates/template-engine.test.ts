import { describe, it, expect } from "vitest";
import { renderTemplate } from "../../src/templates/engine.js";

describe("renderTemplate", () => {
  it("replaces simple variables", () => {
    const result = renderTemplate("Hello {{projectName}}!", {
      projectName: "MyApp",
      framework: "nextjs",
    });
    expect(result).toBe("Hello MyApp!");
  });

  it("replaces multiple variables", () => {
    const result = renderTemplate("{{projectName}} uses {{framework}}", {
      projectName: "MyApp",
      framework: "nextjs",
    });
    expect(result).toBe("MyApp uses nextjs");
  });

  it("replaces undefined values with empty string", () => {
    const result = renderTemplate("key={{missing}}", {
      projectName: "MyApp",
      framework: "nextjs",
    });
    expect(result).toBe("key=");
  });

  it("replaces false values with empty string", () => {
    const result = renderTemplate("enabled={{feature}}", {
      projectName: "MyApp",
      framework: "nextjs",
      feature: false,
    });
    expect(result).toBe("enabled=");
  });

  it("replaces true values with 'true'", () => {
    const result = renderTemplate("enabled={{feature}}", {
      projectName: "MyApp",
      framework: "nextjs",
      feature: true,
    });
    expect(result).toBe("enabled=true");
  });

  it("handles template with no variables", () => {
    const result = renderTemplate("no variables here", {
      projectName: "MyApp",
      framework: "nextjs",
    });
    expect(result).toBe("no variables here");
  });

  it("handles same variable used multiple times", () => {
    const result = renderTemplate("{{projectName}} is {{projectName}}", {
      projectName: "MyApp",
      framework: "nextjs",
    });
    expect(result).toBe("MyApp is MyApp");
  });
});
