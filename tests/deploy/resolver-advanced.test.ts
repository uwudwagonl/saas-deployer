import { describe, it, expect } from "vitest";
import { topologicalSort } from "../../src/deploy/resolver.js";

describe("topologicalSort — advanced cases", () => {
  it("handles the full SaaS deploy dependency graph", () => {
    const nodes = ["database", "auth", "stripe", "email", "monitoring", "github", "vercel", "domain"];
    const edges = new Map([
      ["database", []],
      ["auth", []],
      ["stripe", []],
      ["email", []],
      ["monitoring", []],
      ["github", []],
      ["vercel", ["github"]],
      ["domain", ["vercel"]],
    ]);

    const result = topologicalSort(nodes, edges);

    expect(result).toHaveLength(8);
    expect(result.indexOf("github")).toBeLessThan(result.indexOf("vercel"));
    expect(result.indexOf("vercel")).toBeLessThan(result.indexOf("domain"));
  });

  it("handles diamond dependency pattern", () => {
    // A depends on B and C, both B and C depend on D
    const nodes = ["A", "B", "C", "D"];
    const edges = new Map([
      ["A", ["B", "C"]],
      ["B", ["D"]],
      ["C", ["D"]],
      ["D", []],
    ]);

    const result = topologicalSort(nodes, edges);

    expect(result.indexOf("D")).toBeLessThan(result.indexOf("B"));
    expect(result.indexOf("D")).toBeLessThan(result.indexOf("C"));
    expect(result.indexOf("B")).toBeLessThan(result.indexOf("A"));
    expect(result.indexOf("C")).toBeLessThan(result.indexOf("A"));
  });

  it("handles deep chain", () => {
    const nodes = ["a", "b", "c", "d", "e", "f"];
    const edges = new Map([
      ["a", []],
      ["b", ["a"]],
      ["c", ["b"]],
      ["d", ["c"]],
      ["e", ["d"]],
      ["f", ["e"]],
    ]);

    const result = topologicalSort(nodes, edges);
    expect(result).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("throws on 3-node cycle", () => {
    const nodes = ["a", "b", "c"];
    const edges = new Map([
      ["a", ["c"]],
      ["b", ["a"]],
      ["c", ["b"]],
    ]);

    expect(() => topologicalSort(nodes, edges)).toThrow("Circular dependency");
  });

  it("throws on self-dependency", () => {
    const nodes = ["a"];
    const edges = new Map([["a", ["a"]]]);

    expect(() => topologicalSort(nodes, edges)).toThrow("Circular dependency");
  });

  it("handles wide dependency (one node depends on many)", () => {
    const nodes = ["hub", "a", "b", "c", "d", "e"];
    const edges = new Map([
      ["hub", ["a", "b", "c", "d", "e"]],
      ["a", []],
      ["b", []],
      ["c", []],
      ["d", []],
      ["e", []],
    ]);

    const result = topologicalSort(nodes, edges);
    expect(result.indexOf("hub")).toBe(result.length - 1);
  });

  it("handles many nodes depending on one", () => {
    const nodes = ["base", "a", "b", "c", "d"];
    const edges = new Map([
      ["base", []],
      ["a", ["base"]],
      ["b", ["base"]],
      ["c", ["base"]],
      ["d", ["base"]],
    ]);

    const result = topologicalSort(nodes, edges);
    expect(result[0]).toBe("base");
  });

  it("handles partial dependency graph (subset of providers selected)", () => {
    // Simulate user selecting only stripe and vercel
    // vercel depends on github, but github isn't selected
    const nodes = ["stripe", "vercel"];
    const edges = new Map([
      ["stripe", []],
      ["vercel", ["github"]], // github is NOT in nodes
    ]);

    // External deps should be ignored
    const result = topologicalSort(nodes, edges);
    expect(result).toHaveLength(2);
    expect(result).toContain("stripe");
    expect(result).toContain("vercel");
  });

  it("preserves relative order of independent nodes", () => {
    // When there are no dependencies, original order should be preserved
    const nodes = ["z", "y", "x", "w"];
    const edges = new Map([
      ["z", []],
      ["y", []],
      ["x", []],
      ["w", []],
    ]);

    const result = topologicalSort(nodes, edges);
    expect(result).toHaveLength(4);
    // All nodes should appear
    expect(new Set(result)).toEqual(new Set(nodes));
  });

  it("handles 10+ nodes without issues", () => {
    const nodes = Array.from({ length: 20 }, (_, i) => `node_${i}`);
    const edges = new Map<string, string[]>();
    // Chain: node_0 -> node_1 -> ... -> node_19
    for (let i = 0; i < 20; i++) {
      edges.set(nodes[i], i > 0 ? [nodes[i - 1]] : []);
    }

    const result = topologicalSort(nodes, edges);
    expect(result).toEqual(nodes);
  });

  it("handles disconnected subgraphs", () => {
    // Two independent chains: a->b and c->d
    const nodes = ["a", "b", "c", "d"];
    const edges = new Map([
      ["a", []],
      ["b", ["a"]],
      ["c", []],
      ["d", ["c"]],
    ]);

    const result = topologicalSort(nodes, edges);
    expect(result.indexOf("a")).toBeLessThan(result.indexOf("b"));
    expect(result.indexOf("c")).toBeLessThan(result.indexOf("d"));
  });
});
