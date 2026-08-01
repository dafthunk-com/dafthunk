/**
 * Validation is the gate in front of the engine: anything it lets through is
 * assumed well-formed from that point on. ExecutionGraph, for instance, trusts
 * that cycles were already rejected here and only keeps a backstop.
 *
 * The type-compatibility matrix carries most of the risk, because `any` and
 * `blob` deliberately punch holes in it and those holes must stay exactly the
 * size they are meant to be.
 */

import type { NodeType, Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  detectCycles,
  validateTypeCompatibility,
  validateWorkflow,
} from "./validate-workflow";

/**
 * Builds a workflow from nodes described as `id:type` port lists.
 * `nodes` maps a node id to its output and input port types.
 */
function build(
  nodes: Record<string, { out?: string[]; in?: string[] }>,
  edges: Array<[string, number, string, number]> = []
): Workflow {
  return {
    id: "wf",
    name: "wf",
    trigger: "manual",
    nodes: Object.entries(nodes).map(([id, ports]) => ({
      id,
      name: id,
      type: "test",
      position: { x: 0, y: 0 },
      inputs: (ports.in ?? []).map((type, i) => ({ name: `in${i}`, type })),
      outputs: (ports.out ?? []).map((type, i) => ({ name: `out${i}`, type })),
    })),
    edges: edges.map(([source, sourceIdx, target, targetIdx]) => ({
      source,
      sourceOutput: `out${sourceIdx}`,
      target,
      targetInput: `in${targetIdx}`,
    })),
  } as Workflow;
}

const errorTypes = (workflow: Workflow) =>
  validateWorkflow(workflow).map((e) => e.type);

describe("detectCycles", () => {
  it("accepts a linear chain", () => {
    const workflow = build(
      {
        a: { out: ["string"] },
        b: { in: ["string"], out: ["string"] },
        c: { in: ["string"] },
      },
      [
        ["a", 0, "b", 0],
        ["b", 0, "c", 0],
      ]
    );
    expect(detectCycles(workflow)).toBeNull();
  });

  it("accepts a diamond, which revisits a node without cycling", () => {
    const workflow = build(
      {
        a: { out: ["string"] },
        b: { in: ["string"], out: ["string"] },
        c: { in: ["string"], out: ["string"] },
        d: { in: ["string", "string"] },
      },
      [
        ["a", 0, "b", 0],
        ["a", 0, "c", 0],
        ["b", 0, "d", 0],
        ["c", 0, "d", 1],
      ]
    );
    expect(detectCycles(workflow)).toBeNull();
  });

  it("detects a two-node cycle", () => {
    const workflow = build(
      {
        a: { in: ["string"], out: ["string"] },
        b: { in: ["string"], out: ["string"] },
      },
      [
        ["a", 0, "b", 0],
        ["b", 0, "a", 0],
      ]
    );
    expect(detectCycles(workflow)).toMatchObject({ type: "CYCLE_DETECTED" });
  });

  it("detects a self-loop", () => {
    const workflow = build({ a: { in: ["string"], out: ["string"] } }, [
      ["a", 0, "a", 0],
    ]);
    expect(detectCycles(workflow)).toMatchObject({ type: "CYCLE_DETECTED" });
  });

  it("detects a cycle reachable only from a later root", () => {
    const workflow = build(
      {
        root: { out: ["string"] },
        a: { in: ["string"], out: ["string"] },
        b: { in: ["string"], out: ["string"] },
      },
      [
        ["a", 0, "b", 0],
        ["b", 0, "a", 0],
      ]
    );
    expect(detectCycles(workflow)).toMatchObject({ type: "CYCLE_DETECTED" });
  });

  it("accepts an empty graph", () => {
    expect(detectCycles(build({}))).toBeNull();
  });
});

describe("validateTypeCompatibility", () => {
  const connect = (from: string, to: string) =>
    validateTypeCompatibility(
      build({ a: { out: [from] }, b: { in: [to] } }, [["a", 0, "b", 0]])
    );

  it("accepts matching types", () => {
    expect(connect("string", "string")).toEqual([]);
    expect(connect("number", "number")).toEqual([]);
  });

  it("rejects mismatched types", () => {
    expect(connect("string", "number")).toMatchObject([
      { type: "TYPE_MISMATCH" },
    ]);
  });

  it("lets `any` connect in either direction", () => {
    expect(connect("any", "number")).toEqual([]);
    expect(connect("number", "any")).toEqual([]);
  });

  it.each([
    "image",
    "audio",
    "video",
    "document",
    "gltf",
    "buffergeometry",
  ])("lets blob connect to %s in either direction", (specific) => {
    expect(connect("blob", specific)).toEqual([]);
    expect(connect(specific, "blob")).toEqual([]);
  });

  it("does not let blob stand in for a non-blob type", () => {
    expect(connect("blob", "string")).toMatchObject([
      { type: "TYPE_MISMATCH" },
    ]);
  });

  it("does not let two different blob flavours connect directly", () => {
    // image -> audio has to go through `blob` explicitly; silently allowing it
    // would hand an audio node a PNG.
    expect(connect("image", "audio")).toMatchObject([
      { type: "TYPE_MISMATCH" },
    ]);
  });

  it("reports an edge whose source node does not exist", () => {
    const workflow = build({ b: { in: ["string"] } }, []);
    workflow.edges.push({
      source: "ghost",
      sourceOutput: "out0",
      target: "b",
      targetInput: "in0",
    });

    expect(validateTypeCompatibility(workflow)).toMatchObject([
      { type: "INVALID_CONNECTION" },
    ]);
  });

  it("reports an edge naming a port the node does not have", () => {
    const workflow = build(
      { a: { out: ["string"] }, b: { in: ["string"] } },
      []
    );
    workflow.edges.push({
      source: "a",
      sourceOutput: "nonexistent",
      target: "b",
      targetInput: "in0",
    });

    expect(validateTypeCompatibility(workflow)).toMatchObject([
      { type: "INVALID_CONNECTION" },
    ]);
  });

  it("reports every bad connection rather than stopping at the first", () => {
    const workflow = build(
      { a: { out: ["string"] }, b: { in: ["number", "boolean"] } },
      [
        ["a", 0, "b", 0],
        ["a", 0, "b", 1],
      ]
    );
    expect(validateTypeCompatibility(workflow)).toHaveLength(2);
  });
});

describe("validateWorkflow", () => {
  it("accepts a well-formed workflow", () => {
    const workflow = build({ a: { out: ["string"] }, b: { in: ["string"] } }, [
      ["a", 0, "b", 0],
    ]);
    expect(validateWorkflow(workflow)).toEqual([]);
  });

  it("accepts an empty workflow", () => {
    expect(validateWorkflow(build({}))).toEqual([]);
  });

  it("reports duplicate node ids", () => {
    const workflow = build({ a: { out: ["string"] } });
    workflow.nodes.push({ ...workflow.nodes[0] });

    expect(errorTypes(workflow)).toContain("DUPLICATE_NODE_ID");
  });

  it("names the duplicated id in the message", () => {
    const workflow = build({ a: { out: ["string"] } });
    workflow.nodes.push({ ...workflow.nodes[0] });

    const error = validateWorkflow(workflow).find(
      (e) => e.type === "DUPLICATE_NODE_ID"
    );
    expect(error?.message).toContain("a");
  });

  it("reports a duplicate connection", () => {
    const workflow = build({ a: { out: ["string"] }, b: { in: ["string"] } }, [
      ["a", 0, "b", 0],
      ["a", 0, "b", 0],
    ]);
    expect(errorTypes(workflow)).toContain("DUPLICATE_CONNECTION");
  });

  it("allows two edges from one output into different inputs", () => {
    const workflow = build(
      { a: { out: ["string"] }, b: { in: ["string", "string"] } },
      [
        ["a", 0, "b", 0],
        ["a", 0, "b", 1],
      ]
    );
    expect(validateWorkflow(workflow)).toEqual([]);
  });

  it("reports a cycle through the top-level entry point", () => {
    const workflow = build(
      {
        a: { in: ["string"], out: ["string"] },
        b: { in: ["string"], out: ["string"] },
      },
      [
        ["a", 0, "b", 0],
        ["b", 0, "a", 0],
      ]
    );
    expect(errorTypes(workflow)).toContain("CYCLE_DETECTED");
  });

  it("accumulates several unrelated problems at once", () => {
    const workflow = build({ a: { out: ["string"] }, b: { in: ["number"] } }, [
      ["a", 0, "b", 0],
    ]);
    workflow.nodes.push({ ...workflow.nodes[0] });

    const types = errorTypes(workflow);
    expect(types).toContain("DUPLICATE_NODE_ID");
    expect(types).toContain("TYPE_MISMATCH");
  });

  describe("trigger nodes", () => {
    const nodeTypes = [
      { type: "webhook", trigger: true },
      { type: "cron", trigger: true },
      { type: "plain" },
    ] as NodeType[];

    const withTypes = (types: string[]): Workflow =>
      ({
        id: "wf",
        name: "wf",
        trigger: "manual",
        nodes: types.map((type, i) => ({
          id: `n${i}`,
          name: `n${i}`,
          type,
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: [],
        })),
        edges: [],
      }) as Workflow;

    it("accepts a single trigger node", () => {
      expect(
        validateWorkflow(withTypes(["webhook", "plain"]), nodeTypes)
      ).toEqual([]);
    });

    it("rejects two trigger nodes", () => {
      expect(
        validateWorkflow(withTypes(["webhook", "cron"]), nodeTypes).map(
          (e) => e.type
        )
      ).toContain("DUPLICATE_TRIGGER");
    });

    it("ignores trigger rules when no node types are supplied", () => {
      // The caller did not provide the catalogue, so the check cannot run —
      // it must not guess and reject a valid workflow.
      expect(validateWorkflow(withTypes(["webhook", "cron"]))).toEqual([]);
    });
  });
});
