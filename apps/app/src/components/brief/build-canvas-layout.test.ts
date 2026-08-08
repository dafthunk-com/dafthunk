import type { Edge, Node, Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { layoutWorkflow, NODE_HEIGHT } from "./build-canvas-layout";

/** Positions as the generator's hydrate step assigns them: layers 400 apart. */
function node(id: string, layer: number, index = 0): Node {
  return {
    id,
    name: id,
    type: "test",
    position: { x: layer * 400, y: index * 200 },
    inputs: [],
    outputs: [],
  };
}

function edge(source: string, target: string): Edge {
  return { source, target, sourceOutput: "out", targetInput: "in" };
}

function workflow(nodes: Node[], edges: Edge[] = []): Workflow {
  return {
    id: "wf",
    name: "Test",
    trigger: "manual",
    nodes,
    edges,
  };
}

describe("layoutWorkflow", () => {
  it("returns nothing for an empty graph or an unmeasured container", () => {
    expect(layoutWorkflow(workflow([]), 600)).toBeUndefined();
    expect(layoutWorkflow(workflow([node("a", 0)]), 0)).toBeUndefined();
  });

  it("turns editor layers into rows, top to bottom", () => {
    const layout = layoutWorkflow(
      workflow(
        [node("a", 0), node("b", 1), node("c", 2)],
        [edge("a", "b"), edge("b", "c")]
      ),
      600
    );

    expect(layout).toBeDefined();
    expect(layout?.rows).toBe(3);
    const ys = layout?.nodes.map((n) => n.y);
    expect(ys?.[0]).toBe(0);
    expect(ys?.[1]).toBeGreaterThan(NODE_HEIGHT);
    expect(ys?.[2]).toBeGreaterThan(ys?.[1] ?? 0);
    expect(layout?.height).toBe((ys?.[2] ?? 0) + NODE_HEIGHT);
  });

  it("centres a lone node in its row", () => {
    const layout = layoutWorkflow(workflow([node("a", 0)]), 600);
    const placed = layout?.nodes[0];
    expect(placed).toBeDefined();
    if (!placed) return;
    // Centred: equal space either side.
    expect(placed.x).toBeCloseTo(600 - placed.x - placed.width);
  });

  it("keeps siblings on one row, ordered by their editor y", () => {
    const layout = layoutWorkflow(
      workflow([node("a", 0), node("c", 1, 1), node("b", 1, 0)]),
      600
    );

    const rowOne = layout?.nodes.filter((n) => n.row === 1) ?? [];
    expect(rowOne.map((n) => n.id)).toEqual(["b", "c"]);
    expect(rowOne[0].y).toBe(rowOne[1].y);
    expect(rowOne[0].x).toBeLessThan(rowOne[1].x);
  });

  it("narrows a crowded row instead of overflowing the column", () => {
    const layout = layoutWorkflow(
      workflow([node("a", 0, 0), node("b", 0, 1), node("c", 0, 2)]),
      360
    );

    for (const placed of layout?.nodes ?? []) {
      expect(placed.x).toBeGreaterThanOrEqual(0);
      expect(placed.x + placed.width).toBeLessThanOrEqual(360);
    }
  });

  it("runs edges from the source's bottom port to the target's top port", () => {
    const layout = layoutWorkflow(
      workflow([node("a", 0), node("b", 1)], [edge("a", "b")]),
      600
    );

    const [a, b] = layout?.nodes ?? [];
    const path = layout?.edges[0];
    expect(path?.row).toBe(1);
    expect(
      path?.path.startsWith(`M ${a.x + a.width / 2} ${a.y + NODE_HEIGHT}`)
    ).toBe(true);
    expect(path?.path.endsWith(`${b.x + b.width / 2} ${b.y}`)).toBe(true);
  });

  it("omits edges whose endpoints were dropped in hydration", () => {
    const layout = layoutWorkflow(
      workflow([node("a", 0)], [edge("a", "ghost")]),
      600
    );
    expect(layout?.edges).toEqual([]);
  });
});
