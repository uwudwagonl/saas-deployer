// Topological sort using Kahn's algorithm
export function topologicalSort(
  nodes: string[],
  edges: Map<string, string[]> // node → depends on
): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node, 0);
    adjacency.set(node, []);
  }

  for (const node of nodes) {
    const deps = edges.get(node) ?? [];
    for (const dep of deps) {
      if (nodes.includes(dep)) {
        inDegree.set(node, (inDegree.get(node) ?? 0) + 1);
        adjacency.get(dep)!.push(node);
      }
    }
  }

  const queue: string[] = [];
  for (const [node, degree] of inDegree) {
    if (degree === 0) queue.push(node);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error("Circular dependency detected in service graph");
  }

  return sorted;
}
