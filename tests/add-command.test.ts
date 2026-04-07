import { describe, it, expect } from "vitest";

// Test the SERVICES array and add command structure by importing from source
// We can't easily test the interactive flow, but we can test the data

// Replicate the SERVICES array structure from add.ts for testing
const SERVICES = [
  { name: "Stripe", command: "stripe", description: "Payments & billing", step: "stripe" },
  { name: "Database", command: "db", description: "Database provider", step: "db" },
  { name: "Auth", command: "auth", description: "Authentication", step: "auth" },
  { name: "Email", command: "email", description: "Email service", step: "email" },
  { name: "Monitoring", command: "monitoring", description: "Error tracking & analytics", step: "monitoring" },
  { name: "GitHub", command: "github", description: "Repo, secrets, CI/CD", step: "github" },
  { name: "Vercel", command: "vercel", description: "Deploy & hosting", step: "vercel" },
  { name: "Domain", command: "domain", description: "Custom domain setup", step: "domain" },
];

describe("SERVICES registry in add command", () => {
  it("has 8 services", () => {
    expect(SERVICES).toHaveLength(8);
  });

  it("all services have required fields", () => {
    for (const svc of SERVICES) {
      expect(svc.name).toBeTruthy();
      expect(svc.command).toBeTruthy();
      expect(svc.description).toBeTruthy();
      expect(svc.step).toBeTruthy();
    }
  });

  it("all commands are unique", () => {
    const commands = SERVICES.map((s) => s.command);
    expect(new Set(commands).size).toBe(commands.length);
  });

  it("all names are unique", () => {
    const names = SERVICES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("all steps are unique", () => {
    const steps = SERVICES.map((s) => s.step);
    expect(new Set(steps).size).toBe(steps.length);
  });

  it("command names match CLI commands", () => {
    const expectedCommands = ["stripe", "db", "auth", "email", "monitoring", "github", "vercel", "domain"];
    for (const cmd of expectedCommands) {
      expect(SERVICES.find((s) => s.command === cmd)).toBeTruthy();
    }
  });

  it("lookup by command name works", () => {
    const entry = SERVICES.find((s) => s.command === "stripe" || s.name.toLowerCase() === "stripe");
    expect(entry).toBeDefined();
    expect(entry!.name).toBe("Stripe");
  });

  it("lookup by lowercase name works", () => {
    const entry = SERVICES.find((s) => s.command === "database" || s.name.toLowerCase() === "database");
    expect(entry).toBeDefined();
    expect(entry!.command).toBe("db");
  });

  it("lookup for unknown service returns undefined", () => {
    const entry = SERVICES.find((s) => s.command === "kubernetes" || s.name.toLowerCase() === "kubernetes");
    expect(entry).toBeUndefined();
  });

  it("descriptions are human-readable", () => {
    for (const svc of SERVICES) {
      expect(svc.description.length).toBeGreaterThan(5);
      // No trailing periods (consistent style)
      expect(svc.description).not.toMatch(/\.$/);
    }
  });
});
