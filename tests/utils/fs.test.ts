import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileExists, readJson, writeJson, ensureDir, projectPath } from "../../src/utils/fs.js";

describe("fileExists", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "saas-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns true for existing file", async () => {
    const filePath = join(tmpDir, "test.txt");
    await writeFile(filePath, "hello");
    expect(await fileExists(filePath)).toBe(true);
  });

  it("returns false for non-existing file", async () => {
    expect(await fileExists(join(tmpDir, "nope.txt"))).toBe(false);
  });

  it("returns true for existing directory", async () => {
    expect(await fileExists(tmpDir)).toBe(true);
  });
});

describe("readJson / writeJson", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "saas-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("writes and reads JSON correctly", async () => {
    const filePath = join(tmpDir, "config.json");
    const data = { name: "test", version: 2, items: [1, 2, 3] };

    await writeJson(filePath, data);
    const result = await readJson(filePath);

    expect(result).toEqual(data);
  });

  it("writes formatted JSON with 2-space indentation", async () => {
    const filePath = join(tmpDir, "formatted.json");
    await writeJson(filePath, { a: 1 });

    const raw = await readFile(filePath, "utf-8");
    expect(raw).toBe('{\n  "a": 1\n}\n');
  });

  it("handles nested objects", async () => {
    const filePath = join(tmpDir, "nested.json");
    const data = {
      project: { name: "app", framework: "nextjs" },
      stripe: { products: [{ id: "prod_1" }] },
    };

    await writeJson(filePath, data);
    const result = await readJson(filePath);
    expect(result).toEqual(data);
  });

  it("throws on invalid JSON", async () => {
    const filePath = join(tmpDir, "bad.json");
    await writeFile(filePath, "not json {{{");

    await expect(readJson(filePath)).rejects.toThrow();
  });

  it("throws on non-existing file", async () => {
    await expect(readJson(join(tmpDir, "missing.json"))).rejects.toThrow();
  });

  it("handles empty object", async () => {
    const filePath = join(tmpDir, "empty.json");
    await writeJson(filePath, {});
    expect(await readJson(filePath)).toEqual({});
  });

  it("handles null values", async () => {
    const filePath = join(tmpDir, "null.json");
    await writeJson(filePath, { key: null });
    expect(await readJson(filePath)).toEqual({ key: null });
  });

  it("handles arrays at top level", async () => {
    const filePath = join(tmpDir, "array.json");
    await writeJson(filePath, [1, 2, 3]);
    expect(await readJson(filePath)).toEqual([1, 2, 3]);
  });

  it("handles unicode strings", async () => {
    const filePath = join(tmpDir, "unicode.json");
    await writeJson(filePath, { name: "Vöcklabruck" });
    const result = await readJson<{ name: string }>(filePath);
    expect(result.name).toBe("Vöcklabruck");
  });
});

describe("ensureDir", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "saas-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("creates a new directory", async () => {
    const newDir = join(tmpDir, "new-dir");
    await ensureDir(newDir);
    expect(await fileExists(newDir)).toBe(true);
  });

  it("creates nested directories", async () => {
    const nested = join(tmpDir, "a", "b", "c");
    await ensureDir(nested);
    expect(await fileExists(nested)).toBe(true);
  });

  it("does not throw if directory already exists", async () => {
    await ensureDir(tmpDir);
    // Should not throw
    expect(await fileExists(tmpDir)).toBe(true);
  });
});

describe("projectPath", () => {
  it("returns cwd-relative path", () => {
    const result = projectPath("package.json");
    expect(result).toBe(join(process.cwd(), "package.json"));
  });

  it("handles multiple segments", () => {
    const result = projectPath("src", "config", "schema.ts");
    expect(result).toBe(join(process.cwd(), "src", "config", "schema.ts"));
  });

  it("returns cwd with no args", () => {
    const result = projectPath();
    expect(result).toBe(process.cwd());
  });
});
