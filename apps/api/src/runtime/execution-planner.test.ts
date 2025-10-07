import type { Workflow } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { ExecutionPlanner } from "./execution-planner";

describe("ExecutionPlanner", () => {
  const createMockRegistry = (
    nodeTypes: Record<string, { inlinable?: boolean }>
  ): CloudflareNodeRegistry => {
    return {
      getNodeType: vi.fn((type: string) => nodeTypes[type] || {}),
    } as any;
  };

  describe("createTopologicalOrder", () => {
    it("should create correct topological order for simple linear workflow", () => {
      const workflow: Workflow = {
        id: "test",
        name: "test",
        nodes: [
          { id: "A", type: "text", inputs: [], outputs: [] },
          { id: "B", type: "text", inputs: [], outputs: [] },
          { id: "C", type: "text", inputs: [], outputs: [] },
        ],
        edges: [
          { source: "A", sourceOutput: "out", target: "B", targetInput: "in" },
          { source: "B", sourceOutput: "out", target: "C", targetInput: "in" },
        ],
      } as unknown as Workflow;

      const registry = createMockRegistry({});
      const planner = new ExecutionPlanner(registry);

      const result = planner.createTopologicalOrder(workflow);

      expect(result).toEqual(["A", "B", "C"]);
    });

    it("should handle branching workflows (fan-out)", () => {
      const workflow: Workflow = {
        id: "test",
        name: "test",
        nodes: [
          { id: "A", type: "text", inputs: [], outputs: [] },
          { id: "B", type: "text", inputs: [], outputs: [] },
          { id: "C", type: "text", inputs: [], outputs: [] },
        ],
        edges: [
          { source: "A", sourceOutput: "out", target: "B", targetInput: "in" },
          { source: "A", sourceOutput: "out", target: "C", targetInput: "in" },
        ],
      } as unknown as Workflow;

      const registry = createMockRegistry({});
      const planner = new ExecutionPlanner(registry);

      const result = planner.createTopologicalOrder(workflow);

      expect(result[0]).toBe("A");
      expect(result).toContain("B");
      expect(result).toContain("C");
      expect(result).toHaveLength(3);
    });

    it("should handle merging workflows (fan-in)", () => {
      const workflow: Workflow = {
        id: "test",
        name: "test",
        nodes: [
          { id: "A", type: "text", inputs: [], outputs: [] },
          { id: "B", type: "text", inputs: [], outputs: [] },
          { id: "C", type: "text", inputs: [], outputs: [] },
        ],
        edges: [
          { source: "A", sourceOutput: "out", target: "C", targetInput: "in1" },
          { source: "B", sourceOutput: "out", target: "C", targetInput: "in2" },
        ],
      } as unknown as Workflow;

      const registry = createMockRegistry({});
      const planner = new ExecutionPlanner(registry);

      const result = planner.createTopologicalOrder(workflow);

      expect(result[2]).toBe("C");
      expect(result).toContain("A");
      expect(result).toContain("B");
      expect(result).toHaveLength(3);
    });

    it("should detect cycles and return empty array", () => {
      const workflow: Workflow = {
        id: "test",
        name: "test",
        nodes: [
          { id: "A", type: "text", inputs: [], outputs: [] },
          { id: "B", type: "text", inputs: [], outputs: [] },
          { id: "C", type: "text", inputs: [], outputs: [] },
        ],
        edges: [
          { source: "A", sourceOutput: "out", target: "B", targetInput: "in" },
          { source: "B", sourceOutput: "out", target: "C", targetInput: "in" },
          { source: "C", sourceOutput: "out", target: "A", targetInput: "in" },
        ],
      } as unknown as Workflow;

      const registry = createMockRegistry({});
      const planner = new ExecutionPlanner(registry);

      const result = planner.createTopologicalOrder(workflow);

      expect(result).toEqual([]);
    });

    it("should handle workflow with no edges", () => {
      const workflow: Workflow = {
        id: "test",
        name: "test",
        nodes: [
          { id: "A", type: "text", inputs: [], outputs: [] },
          { id: "B", type: "text", inputs: [], outputs: [] },
        ],
        edges: [],
      } as unknown as Workflow;

      const registry = createMockRegistry({});
      const planner = new ExecutionPlanner(registry);

      const result = planner.createTopologicalOrder(workflow);

      expect(result).toHaveLength(2);
      expect(result).toContain("A");
      expect(result).toContain("B");
    });
  });

  describe("createExecutionPlan", () => {
    it("should create individual execution units for non-inlinable nodes", () => {
      const workflow: Workflow = {
        id: "test",
        name: "test",
        nodes: [
          { id: "A", type: "text", inputs: [], outputs: [] },
          { id: "B", type: "text", inputs: [], outputs: [] },
        ],
        edges: [
          { source: "A", sourceOutput: "out", target: "B", targetInput: "in" },
        ],
      } as unknown as Workflow;

      const registry = createMockRegistry({
        text: { inlinable: false },
      });
      const planner = new ExecutionPlanner(registry);

      const ordered = ["A", "B"];
      const result = planner.createExecutionPlan(workflow, ordered);

      expect(result).toEqual([
        { type: "individual", nodeId: "A" },
        { type: "individual", nodeId: "B" },
      ]);
    });

    it("should group consecutive inlinable nodes", () => {
      const workflow: Workflow = {
        id: "test",
        name: "test",
        nodes: [
          { id: "A", type: "math", inputs: [], outputs: [] },
          { id: "B", type: "math", inputs: [], outputs: [] },
          { id: "C", type: "math", inputs: [], outputs: [] },
        ],
        edges: [
          { source: "A", sourceOutput: "out", target: "B", targetInput: "in" },
          { source: "B", sourceOutput: "out", target: "C", targetInput: "in" },
        ],
      } as unknown as Workflow;

      const registry = createMockRegistry({
        math: { inlinable: true },
      });
      const planner = new ExecutionPlanner(registry);

      const ordered = ["A", "B", "C"];
      const result = planner.createExecutionPlan(workflow, ordered);

      expect(result).toEqual([{ type: "inline", nodeIds: ["A", "B", "C"] }]);
    });

    it("should handle mixed inlinable and non-inlinable nodes", () => {
      const workflow: Workflow = {
        id: "test",
        name: "test",
        nodes: [
          { id: "A", type: "math", inputs: [], outputs: [] },
          { id: "B", type: "ai", inputs: [], outputs: [] },
          { id: "C", type: "math", inputs: [], outputs: [] },
        ],
        edges: [
          { source: "A", sourceOutput: "out", target: "B", targetInput: "in" },
          { source: "B", sourceOutput: "out", target: "C", targetInput: "in" },
        ],
      } as unknown as Workflow;

      const registry = createMockRegistry({
        math: { inlinable: true },
        ai: { inlinable: false },
      });
      const planner = new ExecutionPlanner(registry);

      const ordered = ["A", "B", "C"];
      const result = planner.createExecutionPlan(workflow, ordered);

      expect(result).toEqual([
        { type: "individual", nodeId: "A" },
        { type: "individual", nodeId: "B" },
        { type: "individual", nodeId: "C" },
      ]);
    });

    it("should group fan-out pattern of inlinable nodes", () => {
      const workflow: Workflow = {
        id: "test",
        name: "test",
        nodes: [
          { id: "A", type: "math", inputs: [], outputs: [] },
          { id: "B", type: "math", inputs: [], outputs: [] },
          { id: "C", type: "math", inputs: [], outputs: [] },
        ],
        edges: [
          { source: "A", sourceOutput: "out", target: "B", targetInput: "in" },
          { source: "A", sourceOutput: "out", target: "C", targetInput: "in" },
        ],
      } as unknown as Workflow;

      const registry = createMockRegistry({
        math: { inlinable: true },
      });
      const planner = new ExecutionPlanner(registry);

      const ordered = ["A", "B", "C"];
      const result = planner.createExecutionPlan(workflow, ordered);

      expect(result).toEqual([{ type: "inline", nodeIds: ["A", "B", "C"] }]);
    });

    it("should handle single inlinable node as individual", () => {
      const workflow: Workflow = {
        id: "test",
        name: "test",
        nodes: [{ id: "A", type: "math", inputs: [], outputs: [] }],
        edges: [],
      } as unknown as Workflow;

      const registry = createMockRegistry({
        math: { inlinable: true },
      });
      const planner = new ExecutionPlanner(registry);

      const ordered = ["A"];
      const result = planner.createExecutionPlan(workflow, ordered);

      expect(result).toEqual([{ type: "individual", nodeId: "A" }]);
    });
  });
});
