import { describe, it, expect } from "vitest";
import { topologicalSort } from "../src/deploy/resolver.js";

describe("topologicalSort", () => {
  it("returns nodes in dependency order", () => {
    const nodes = ["vercel", "github", "stripe", "db"];
    const edges = new Map([
      ["vercel", ["github"]],
      ["github", ["stripe", "db"]],
      ["stripe", []],
      ["db", []],
    ]);

    const result = topologicalSort(nodes, edges);

    // stripe and db must come before github, github before vercel
    expect(result.indexOf("stripe")).toBeLessThan(result.indexOf("github"));
    expect(result.indexOf("db")).toBeLessThan(result.indexOf("github"));
    expect(result.indexOf("github")).toBeLessThan(result.indexOf("vercel"));
  });

  it("handles nodes with no dependencies", () => {
    const nodes = ["a", "b", "c"];
    const edges = new Map<string, string[]>([
      ["a", []],
      ["b", []],
      ["c", []],
    ]);

    const result = topologicalSort(nodes, edges);
    expect(result).toHaveLength(3);
    expect(result).toContain("a");
    expect(result).toContain("b");
    expect(result).toContain("c");
  });

  it("handles linear chain", () => {
    const nodes = ["c", "b", "a"];
    const edges = new Map([
      ["c", ["b"]],
      ["b", ["a"]],
      ["a", []],
    ]);

    const result = topologicalSort(nodes, edges);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("throws on circular dependency", () => {
    const nodes = ["a", "b"];
    const edges = new Map([
      ["a", ["b"]],
      ["b", ["a"]],
    ]);

    expect(() => topologicalSort(nodes, edges)).toThrow("Circular dependency");
  });

  it("ignores dependencies not in the node list", () => {
    const nodes = ["a", "b"];
    const edges = new Map([
      ["a", ["external"]],
      ["b", []],
    ]);

    const result = topologicalSort(nodes, edges);
    expect(result).toHaveLength(2);
  });

  it("handles single node", () => {
    const result = topologicalSort(["only"], new Map([["only", []]]));
    expect(result).toEqual(["only"]);
  });

  it("handles empty input", () => {
    const result = topologicalSort([], new Map());
    expect(result).toEqual([]);
  });
});
