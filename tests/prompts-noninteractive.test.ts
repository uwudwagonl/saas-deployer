import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { input, confirm, select, checkbox, password } from "../src/ui/prompts.js";

/**
 * Test non-interactive mode behavior of the prompts wrapper.
 * These tests set SAAS_YES=true which makes isInteractive() return false,
 * forcing prompts to use defaults or env var fallbacks.
 */
describe("prompts in non-interactive mode", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SAAS_YES = "true";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("input()", () => {
    it("returns default value when available", async () => {
      const result = await input({
        message: "Name:",
        default: "my-app",
      });
      expect(result).toBe("my-app");
    });

    it("returns env var when envVar is set", async () => {
      process.env.MY_INPUT = "from-env";
      const result = await input({
        message: "Name:",
        envVar: "MY_INPUT",
      });
      expect(result).toBe("from-env");
      delete process.env.MY_INPUT;
    });

    it("env var takes precedence over default", async () => {
      process.env.MY_INPUT = "from-env";
      const result = await input({
        message: "Name:",
        default: "default-value",
        envVar: "MY_INPUT",
      });
      expect(result).toBe("from-env");
      delete process.env.MY_INPUT;
    });

    it("throws when no default and no env var", async () => {
      await expect(
        input({ message: "Required:" })
      ).rejects.toThrow("Non-interactive mode");
    });

    it("error message includes envVar name when provided", async () => {
      await expect(
        input({ message: "API Key:", envVar: "MY_API_KEY" })
      ).rejects.toThrow("MY_API_KEY");
    });
  });

  describe("confirm()", () => {
    it("returns default when available", async () => {
      const result = await confirm({
        message: "Continue?",
        default: false,
      });
      expect(result).toBe(false);
    });

    it("defaults to true when no default specified", async () => {
      const result = await confirm({
        message: "Continue?",
      });
      expect(result).toBe(true);
    });

    it("parses env var 'true' as true", async () => {
      process.env.MY_CONFIRM = "true";
      const result = await confirm({
        message: "Confirm?",
        envVar: "MY_CONFIRM",
      });
      expect(result).toBe(true);
      delete process.env.MY_CONFIRM;
    });

    it("parses env var '1' as true", async () => {
      process.env.MY_CONFIRM = "1";
      const result = await confirm({
        message: "Confirm?",
        envVar: "MY_CONFIRM",
      });
      expect(result).toBe(true);
      delete process.env.MY_CONFIRM;
    });

    it("parses env var 'false' as false", async () => {
      process.env.MY_CONFIRM = "false";
      const result = await confirm({
        message: "Confirm?",
        envVar: "MY_CONFIRM",
      });
      expect(result).toBe(false);
      delete process.env.MY_CONFIRM;
    });
  });

  describe("select()", () => {
    it("returns env var when set", async () => {
      process.env.MY_SELECT = "option-b";
      const result = await select({
        message: "Pick one:",
        choices: [
          { name: "A", value: "option-a" },
          { name: "B", value: "option-b" },
        ],
        envVar: "MY_SELECT",
      });
      expect(result).toBe("option-b");
      delete process.env.MY_SELECT;
    });

    it("throws when no env var and no default", async () => {
      await expect(
        select({
          message: "Pick one:",
          choices: [
            { name: "A", value: "option-a" },
          ],
        })
      ).rejects.toThrow("Non-interactive mode");
    });
  });

  describe("checkbox()", () => {
    it("returns empty array when no env var", async () => {
      const result = await checkbox({
        message: "Select many:",
        choices: [
          { name: "A", value: "a" },
          { name: "B", value: "b" },
        ],
      });
      expect(result).toEqual([]);
    });

    it("parses comma-separated env var", async () => {
      process.env.MY_CHECKBOX = "a,b,c";
      const result = await checkbox({
        message: "Select:",
        choices: [],
        envVar: "MY_CHECKBOX",
      });
      expect(result).toEqual(["a", "b", "c"]);
      delete process.env.MY_CHECKBOX;
    });
  });

  describe("password()", () => {
    it("returns env var when set", async () => {
      process.env.MY_SECRET = "secret-value";
      const result = await password({
        message: "Password:",
        envVar: "MY_SECRET",
      });
      expect(result).toBe("secret-value");
      delete process.env.MY_SECRET;
    });

    it("throws when no env var", async () => {
      await expect(
        password({ message: "Password:" })
      ).rejects.toThrow("Non-interactive mode");
    });
  });
});
