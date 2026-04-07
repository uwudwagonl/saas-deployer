import { describe, it, expect } from "vitest";
import { run, commandExists } from "../../src/utils/exec.js";

describe("run", () => {
  it("runs a simple command and returns stdout", async () => {
    const result = await run("echo", ["hello"]);
    expect(result.stdout).toContain("hello");
  });

  it("trims stdout", async () => {
    const result = await run("echo", ["  spaces  "]);
    // echo adds a newline, run trims it
    expect(result.stdout).not.toMatch(/\n$/);
  });

  it("throws on non-existent command", async () => {
    await expect(run("definitely-not-a-real-command-xyz", [])).rejects.toThrow();
  });

  it("returns empty stderr for clean commands", async () => {
    const result = await run("echo", ["test"]);
    expect(result.stderr).toBe("");
  });

  it("works with no arguments", async () => {
    const result = await run("echo", []);
    expect(typeof result.stdout).toBe("string");
  });
});

describe("commandExists", () => {
  it("returns true for node", async () => {
    expect(await commandExists("node")).toBe(true);
  });

  it("returns true for npm", async () => {
    expect(await commandExists("npm")).toBe(true);
  });

  it("returns false for non-existent command", async () => {
    expect(await commandExists("totally-fake-command-qwerty-12345")).toBe(false);
  });

  it("returns true for echo", async () => {
    expect(await commandExists("echo")).toBe(true);
  });
});
