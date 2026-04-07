import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createContext, isInteractive, isDryRun, isVerbose } from "../src/utils/context.js";

describe("createContext", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("creates default context in non-CI environment", () => {
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;

    const ctx = createContext({});
    expect(ctx.dryRun).toBe(false);
    expect(ctx.verbose).toBe(false);
    expect(ctx.yes).toBe(false);
  });

  it("detects CI from CI env var", () => {
    process.env.CI = "true";
    const ctx = createContext({});
    expect(ctx.interactive).toBe(false);
    expect(ctx.yes).toBe(true);
  });

  it("detects CI from GITHUB_ACTIONS", () => {
    process.env.GITHUB_ACTIONS = "true";
    const ctx = createContext({});
    expect(ctx.interactive).toBe(false);
    expect(ctx.yes).toBe(true);
  });

  it("detects CI from GITLAB_CI", () => {
    process.env.GITLAB_CI = "true";
    const ctx = createContext({});
    expect(ctx.interactive).toBe(false);
  });

  it("respects noInteractive flag", () => {
    delete process.env.CI;
    const ctx = createContext({ noInteractive: true });
    expect(ctx.interactive).toBe(false);
  });

  it("respects dryRun flag", () => {
    const ctx = createContext({ dryRun: true });
    expect(ctx.dryRun).toBe(true);
  });

  it("respects verbose flag", () => {
    const ctx = createContext({ verbose: true });
    expect(ctx.verbose).toBe(true);
  });

  it("respects yes flag", () => {
    const ctx = createContext({ yes: true });
    expect(ctx.yes).toBe(true);
  });

  it("yes defaults to true in CI", () => {
    process.env.CI = "true";
    const ctx = createContext({});
    expect(ctx.yes).toBe(true);
  });
});

describe("isInteractive", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns false when CI is set", () => {
    process.env.CI = "true";
    expect(isInteractive()).toBe(false);
  });

  it("returns false when SAAS_INTERACTIVE is false", () => {
    delete process.env.CI;
    process.env.SAAS_INTERACTIVE = "false";
    expect(isInteractive()).toBe(false);
  });

  it("returns false when SAAS_YES is true", () => {
    delete process.env.CI;
    delete process.env.SAAS_INTERACTIVE;
    process.env.SAAS_YES = "true";
    expect(isInteractive()).toBe(false);
  });
});

describe("isDryRun", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns false by default", () => {
    delete process.env.SAAS_DRY_RUN;
    expect(isDryRun()).toBe(false);
  });

  it("returns true when SAAS_DRY_RUN is true", () => {
    process.env.SAAS_DRY_RUN = "true";
    expect(isDryRun()).toBe(true);
  });
});

describe("isVerbose", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns false by default", () => {
    delete process.env.SAAS_VERBOSE;
    delete process.env.DEBUG;
    expect(isVerbose()).toBe(false);
  });

  it("returns true when SAAS_VERBOSE is true", () => {
    process.env.SAAS_VERBOSE = "true";
    expect(isVerbose()).toBe(true);
  });

  it("returns true when DEBUG is set", () => {
    process.env.DEBUG = "1";
    expect(isVerbose()).toBe(true);
  });
});
