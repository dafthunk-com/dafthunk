import type { Node, Workflow } from "@dafthunk/types";

/**
 * Re-projects the generator's editor layout into a compact vertical one.
 *
 * The generator positions nodes for the editor canvas — topological layers on
 * x, siblings on y, 400px apart — which is far too wide for a one-column page:
 * a six-step chain would scale to illegibility. Read vertically, the same
 * layering fits: each layer becomes a row, the graph reads top-to-bottom the
 * way the run actually flows, and node text stays at full size.
 *
 * The layering is read off the stored positions rather than re-derived from
 * the edges, so this view can never disagree with what the editor shows when
 * the workflow is opened.
 */

export const NODE_HEIGHT = 40;
const ROW_GAP = 36;
const NODE_WIDTH = 176;
const NODE_GAP = 16;

export interface CanvasNode {
  id: string;
  name: string;
  icon?: string;
  x: number;
  y: number;
  width: number;
  /** Topological row — the unit every staggered animation counts in. */
  row: number;
}

export interface CanvasEdge {
  id: string;
  /** SVG path from the source's bottom port to the target's top port. */
  path: string;
  /** The target's row, so an edge appears together with the node it feeds. */
  row: number;
}

export interface CanvasLayout {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  width: number;
  height: number;
  /** Row count, for sizing the tail of a staggered animation. */
  rows: number;
}

export function layoutWorkflow(
  workflow: Workflow,
  width: number
): CanvasLayout | undefined {
  if (workflow.nodes.length === 0 || width <= 0) return undefined;

  const layerXs = [
    ...new Set(workflow.nodes.map((node) => node.position.x)),
  ].sort((a, b) => a - b);
  const rowByX = new Map(layerXs.map((x, row) => [x, row]));

  const rows: Node[][] = layerXs.map(() => []);
  for (const node of workflow.nodes) {
    rows[rowByX.get(node.position.x) ?? 0].push(node);
  }
  for (const row of rows) row.sort((a, b) => a.position.y - b.position.y);

  const nodes: CanvasNode[] = [];
  const placed = new Map<string, CanvasNode>();
  rows.forEach((rowNodes, row) => {
    // A crowded row narrows its nodes rather than overflowing the column.
    const nodeWidth = Math.min(
      NODE_WIDTH,
      (width - NODE_GAP * (rowNodes.length - 1)) / rowNodes.length
    );
    const rowWidth =
      rowNodes.length * nodeWidth + (rowNodes.length - 1) * NODE_GAP;
    const left = (width - rowWidth) / 2;

    rowNodes.forEach((node, index) => {
      const canvasNode: CanvasNode = {
        id: node.id,
        name: node.name,
        icon: node.icon,
        x: left + index * (nodeWidth + NODE_GAP),
        y: row * (NODE_HEIGHT + ROW_GAP),
        width: nodeWidth,
        row,
      };
      nodes.push(canvasNode);
      placed.set(node.id, canvasNode);
    });
  });

  const edges: CanvasEdge[] = [];
  const seen = new Set<string>();
  for (const edge of workflow.edges) {
    const source = placed.get(edge.source);
    const target = placed.get(edge.target);
    // An edge naming a node that was dropped in hydration has nothing to
    // point at; the validator reports it, the picture just omits it.
    if (!source || !target) continue;

    const id = `${edge.source}:${edge.sourceOutput}-${edge.target}:${edge.targetInput}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const x1 = source.x + source.width / 2;
    const y1 = source.y + NODE_HEIGHT;
    const x2 = target.x + target.width / 2;
    const y2 = target.y;
    const bend = Math.max(12, (y2 - y1) / 2);
    edges.push({
      id,
      path: `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`,
      row: target.row,
    });
  }

  return {
    nodes,
    edges,
    width,
    height: rows.length * NODE_HEIGHT + (rows.length - 1) * ROW_GAP,
    rows: rows.length,
  };
}
