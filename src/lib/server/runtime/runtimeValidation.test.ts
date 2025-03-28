import { describe, it, expect } from "vitest";
import {
  detectCycles,
  validateTypeCompatibility,
  validateWorkflow,
} from "./runtimeValidation";
import type { Workflow, Node, Edge } from "./runtimeTypes";
import {
  StringRuntimeParameter,
  NumberRuntimeParameter,
} from "./runtimeParameterTypes";

describe("workflowValidation", () => {
  // Helper function to create a basic node
  const createNode = (
    id: string,
    inputs: any[] = [],
    outputs: any[] = []
  ): Node => ({
    id,
    name: `Node ${id}`,
    type: "test",
    position: { x: 0, y: 0 },
    inputs,
    outputs,
  });

  // Helper function to create a basic edge
  const createEdge = (
    source: string,
    target: string,
    sourceOutput: string,
    targetInput: string
  ): Edge => ({
    source,
    target,
    sourceOutput,
    targetInput,
  });

  describe("detectCycles", () => {
    it("should return null for a workflow with no cycles", () => {
      const workflow: Workflow = {
        id: "test",
        name: "Test Workflow",
        nodes: [createNode("1"), createNode("2"), createNode("3")],
        edges: [
          createEdge("1", "2", "out1", "in1"),
          createEdge("2", "3", "out1", "in1"),
        ],
      };

      const result = detectCycles(workflow);
      expect(result).toBeNull();
    });

    it("should detect a simple cycle", () => {
      const workflow: Workflow = {
        id: "test",
        name: "Test Workflow",
        nodes: [createNode("1"), createNode("2"), createNode("3")],
        edges: [
          createEdge("1", "2", "out1", "in1"),
          createEdge("2", "3", "out1", "in1"),
          createEdge("3", "1", "out1", "in1"),
        ],
      };

      const result = detectCycles(workflow);
      expect(result).toEqual({
        type: "CYCLE_DETECTED",
        message: "Cycle detected in workflow",
        details: { nodeId: "1" },
      });
    });
  });

  describe("validateTypeCompatibility", () => {
    it("should return null for compatible types", () => {
      const workflow: Workflow = {
        id: "test",
        name: "Test Workflow",
        nodes: [
          {
            ...createNode("1"),
            outputs: [{ name: "out1", type: StringRuntimeParameter }],
          },
          {
            ...createNode("2"),
            inputs: [{ name: "in1", type: StringRuntimeParameter }],
          },
        ],
        edges: [createEdge("1", "2", "out1", "in1")],
      };

      const result = validateTypeCompatibility(workflow);
      expect(result).toBeNull();
    });

    it("should detect type mismatches", () => {
      const workflow: Workflow = {
        id: "test",
        name: "Test Workflow",
        nodes: [
          {
            ...createNode("1"),
            outputs: [{ name: "out1", type: StringRuntimeParameter }],
          },
          {
            ...createNode("2"),
            inputs: [{ name: "in1", type: NumberRuntimeParameter }],
          },
        ],
        edges: [createEdge("1", "2", "out1", "in1")],
      };

      const result = validateTypeCompatibility(workflow);
      expect(result).toEqual({
        type: "TYPE_MISMATCH",
        message: "Type mismatch: string -> number",
        details: {
          connectionSource: "1",
          connectionTarget: "2",
        },
      });
    });

    it("should detect invalid node references", () => {
      const workflow: Workflow = {
        id: "test",
        name: "Test Workflow",
        nodes: [createNode("1")],
        edges: [createEdge("1", "2", "out1", "in1")],
      };

      const result = validateTypeCompatibility(workflow);
      expect(result).toEqual({
        type: "INVALID_CONNECTION",
        message: "Invalid node reference in connection",
        details: {
          connectionSource: "1",
          connectionTarget: "2",
        },
      });
    });

    it("should detect invalid parameter references", () => {
      const workflow: Workflow = {
        id: "test",
        name: "Test Workflow",
        nodes: [createNode("1"), createNode("2")],
        edges: [createEdge("1", "2", "nonexistent", "in1")],
      };

      const result = validateTypeCompatibility(workflow);
      expect(result).toEqual({
        type: "INVALID_CONNECTION",
        message: "Invalid parameter reference in connection",
        details: {
          connectionSource: "1",
          connectionTarget: "2",
        },
      });
    });
  });

  describe("validateWorkflow", () => {
    it("should return empty array for valid workflow", () => {
      const workflow: Workflow = {
        id: "test",
        name: "Test Workflow",
        nodes: [
          {
            ...createNode("1"),
            outputs: [{ name: "out1", type: StringRuntimeParameter }],
          },
          {
            ...createNode("2"),
            inputs: [{ name: "in1", type: StringRuntimeParameter }],
          },
        ],
        edges: [createEdge("1", "2", "out1", "in1")],
      };

      const result = validateWorkflow(workflow);
      expect(result).toEqual([]);
    });

    it("should detect multiple errors", () => {
      const workflow: Workflow = {
        id: "test",
        name: "Test Workflow",
        nodes: [
          {
            ...createNode("1"),
            outputs: [{ name: "out1", type: StringRuntimeParameter }],
          },
          {
            ...createNode("2"),
            inputs: [{ name: "in1", type: NumberRuntimeParameter }],
          },
        ],
        edges: [
          createEdge("1", "2", "out1", "in1"),
          createEdge("1", "2", "out1", "in1"), // Duplicate connection
        ],
      };

      const result = validateWorkflow(workflow);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        type: "TYPE_MISMATCH",
        message: "Type mismatch: string -> number",
        details: {
          connectionSource: "1",
          connectionTarget: "2",
        },
      });
      expect(result).toContainEqual({
        type: "DUPLICATE_CONNECTION",
        message: "Duplicate connection detected",
        details: {
          connectionSource: "1",
          connectionTarget: "2",
        },
      });
    });
  });
});
