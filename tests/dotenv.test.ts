import { describe, it, expect } from "vitest";
import { parseDotEnv, diffEnv } from "../src/env/dotenv.js";

describe("parseDotEnv", () => {
  it("parses simple key-value pairs", () => {
    const result = parseDotEnv("FOO=bar\nBAZ=qux");
    expect(result).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  it("ignores comments", () => {
    const result = parseDotEnv("# comment\nFOO=bar");
    expect(result).toEqual({ FOO: "bar" });
  });

  it("ignores empty lines", () => {
    const result = parseDotEnv("FOO=bar\n\n\nBAZ=qux");
    expect(result).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  it("strips double quotes", () => {
    const result = parseDotEnv('FOO="bar baz"');
    expect(result).toEqual({ FOO: "bar baz" });
  });

  it("strips single quotes", () => {
    const result = parseDotEnv("FOO='bar baz'");
    expect(result).toEqual({ FOO: "bar baz" });
  });

  it("handles values with equals sign", () => {
    const result = parseDotEnv("URL=postgres://user:pass@host:5432/db?ssl=true");
    expect(result).toEqual({ URL: "postgres://user:pass@host:5432/db?ssl=true" });
  });

  it("handles empty values", () => {
    const result = parseDotEnv("EMPTY=");
    expect(result).toEqual({ EMPTY: "" });
  });

  it("returns empty object for empty string", () => {
    expect(parseDotEnv("")).toEqual({});
  });

  it("ignores lines without equals", () => {
    const result = parseDotEnv("NOEQ\nFOO=bar");
    expect(result).toEqual({ FOO: "bar" });
  });
});

describe("diffEnv", () => {
  it("detects added keys", () => {
    const diff = diffEnv({ A: "1", B: "2" }, { A: "1" });
    expect(diff.added).toEqual(["B"]);
  });

  it("detects removed keys", () => {
    const diff = diffEnv({ A: "1" }, { A: "1", B: "2" });
    expect(diff.removed).toEqual(["B"]);
  });

  it("detects changed values", () => {
    const diff = diffEnv({ A: "new" }, { A: "old" });
    expect(diff.changed).toEqual(["A"]);
  });

  it("detects unchanged keys", () => {
    const diff = diffEnv({ A: "same" }, { A: "same" });
    expect(diff.unchanged).toEqual(["A"]);
  });

  it("handles empty objects", () => {
    const diff = diffEnv({}, {});
    expect(diff).toEqual({ added: [], removed: [], changed: [], unchanged: [] });
  });

  it("handles all categories at once", () => {
    const diff = diffEnv(
      { ADDED: "new", CHANGED: "v2", SAME: "ok" },
      { REMOVED: "old", CHANGED: "v1", SAME: "ok" }
    );
    expect(diff.added).toEqual(["ADDED"]);
    expect(diff.removed).toEqual(["REMOVED"]);
    expect(diff.changed).toEqual(["CHANGED"]);
    expect(diff.unchanged).toEqual(["SAME"]);
  });
});
