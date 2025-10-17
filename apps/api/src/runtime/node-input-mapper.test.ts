import type { Workflow } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import type { ObjectStore } from "../stores/object-store";
import { NodeInputMapper } from "./node-input-mapper";
import type { RuntimeState } from "./runtime";

describe("NodeInputMapper", () => {
  const createMockRegistry = (
    nodeTypes: Record<
      string,
      {
        inputs?: Array<{
          name: string;
          repeated?: boolean;
          required?: boolean;
        }>;
      }
    >
  ): CloudflareNodeRegistry => {
    return {
      createExecutableNode: vi.fn((node) => ({
        constructor: {
          nodeType: nodeTypes[node.type],
        },
      })),
    } as any;
  };

  describe("collectNodeInputs", () => {
    it("should collect default values from node definition", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-1",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "text",
              inputs: [
                { name: "text", type: "string", value: "hello" },
                { name: "count", type: "number", value: 42 },
              ],
              outputs: [],
            },
          ],
          edges: [],
        } as unknown as Workflow,
        nodeOutputs: new Map(),
        executedNodes: new Set(),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({
        text: {
          inputs: [
            { name: "text", required: false },
            { name: "count", required: false },
          ],
        },
      });
      const mapper = new NodeInputMapper(registry);

      const result = mapper.collectNodeInputs(runtimeState, "A");

      expect(result).toEqual({
        text: "hello",
        count: 42,
      });
    });

    it("should collect values from connected nodes", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-2",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "text",
              inputs: [],
              outputs: [{ name: "result", type: "string" }],
            },
            {
              id: "B",
              type: "text",
              inputs: [{ name: "input", type: "string" }],
              outputs: [],
            },
          ],
          edges: [
            {
              source: "A",
              sourceOutput: "result",
              target: "B",
              targetInput: "input",
            },
          ],
        } as unknown as Workflow,
        nodeOutputs: new Map([["A", { result: "test value" }]]),
        executedNodes: new Set(["A"]),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({
        text: { inputs: [{ name: "input", required: false }] },
      });
      const mapper = new NodeInputMapper(registry);

      const result = mapper.collectNodeInputs(runtimeState, "B");

      expect(result).toEqual({
        input: "test value",
      });
    });

    it("should handle repeated parameters as array", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-3",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "text",
              inputs: [],
              outputs: [{ name: "out", type: "string" }],
            },
            {
              id: "B",
              type: "text",
              inputs: [],
              outputs: [{ name: "out", type: "string" }],
            },
            {
              id: "C",
              type: "merge",
              inputs: [{ name: "values", type: "string" }],
              outputs: [],
            },
          ],
          edges: [
            {
              source: "A",
              sourceOutput: "out",
              target: "C",
              targetInput: "values",
            },
            {
              source: "B",
              sourceOutput: "out",
              target: "C",
              targetInput: "values",
            },
          ],
        } as unknown as Workflow,
        nodeOutputs: new Map([
          ["A", { out: "value1" }],
          ["B", { out: "value2" }],
        ]),
        executedNodes: new Set(["A", "B"]),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({
        merge: { inputs: [{ name: "values", repeated: true }] },
      });
      const mapper = new NodeInputMapper(registry);

      const result = mapper.collectNodeInputs(runtimeState, "C");

      expect(result).toEqual({
        values: ["value1", "value2"],
      });
    });

    it("should use last value for non-repeated parameters with multiple connections", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-4",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "text",
              inputs: [],
              outputs: [{ name: "out", type: "string" }],
            },
            {
              id: "B",
              type: "text",
              inputs: [],
              outputs: [{ name: "out", type: "string" }],
            },
            {
              id: "C",
              type: "text",
              inputs: [{ name: "input", type: "string" }],
              outputs: [],
            },
          ],
          edges: [
            {
              source: "A",
              sourceOutput: "out",
              target: "C",
              targetInput: "input",
            },
            {
              source: "B",
              sourceOutput: "out",
              target: "C",
              targetInput: "input",
            },
          ],
        } as unknown as Workflow,
        nodeOutputs: new Map([
          ["A", { out: "value1" }],
          ["B", { out: "value2" }],
        ]),
        executedNodes: new Set(["A", "B"]),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({
        text: { inputs: [{ name: "input", repeated: false }] },
      });
      const mapper = new NodeInputMapper(registry);

      const result = mapper.collectNodeInputs(runtimeState, "C");

      expect(result).toEqual({
        input: "value2", // Last value
      });
    });

    it("should return empty object for node not found", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-5",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [],
          edges: [],
        } as unknown as Workflow,
        nodeOutputs: new Map(),
        executedNodes: new Set(),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({});
      const mapper = new NodeInputMapper(registry);

      const result = mapper.collectNodeInputs(runtimeState, "NonExistent");

      expect(result).toEqual({});
    });
  });

  describe("mapRuntimeToNodeInputs", () => {
    it("should throw error for missing required input", async () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-6",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "text",
              inputs: [{ name: "required", type: "string", required: true }],
              outputs: [],
            },
          ],
          edges: [],
        } as unknown as Workflow,
        nodeOutputs: new Map(),
        executedNodes: new Set(),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({
        text: { inputs: [{ name: "required", required: true }] },
      });
      const mapper = new NodeInputMapper(registry);
      const mockStore = {} as ObjectStore;

      await expect(
        mapper.mapRuntimeToNodeInputs(runtimeState, "A", {}, mockStore)
      ).rejects.toThrow("Required input 'required' missing for node A");
    });

    it("should skip undefined and null values", async () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-7",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "text",
              inputs: [
                { name: "optional1", type: "string", required: false },
                { name: "optional2", type: "string", required: false },
              ],
              outputs: [],
            },
          ],
          edges: [],
        } as unknown as Workflow,
        nodeOutputs: new Map(),
        executedNodes: new Set(),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({
        text: {
          inputs: [
            { name: "optional1", required: false },
            { name: "optional2", required: false },
          ],
        },
      });
      const mapper = new NodeInputMapper(registry);
      const mockStore = {} as ObjectStore;

      const result = await mapper.mapRuntimeToNodeInputs(
        runtimeState,
        "A",
        { optional1: undefined, optional2: null },
        mockStore
      );

      expect(result).toEqual({});
    });

    it("should process repeated parameters as array", async () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-8",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "merge",
              inputs: [{ name: "values", type: "string", required: false }],
              outputs: [],
            },
          ],
          edges: [],
        } as unknown as Workflow,
        nodeOutputs: new Map(),
        executedNodes: new Set(),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({
        merge: { inputs: [{ name: "values", repeated: true }] },
      });
      const mapper = new NodeInputMapper(registry);
      const mockStore = {} as ObjectStore;

      const result = await mapper.mapRuntimeToNodeInputs(
        runtimeState,
        "A",
        { values: ["a", "b", "c"] },
        mockStore
      );

      expect(result).toEqual({
        values: ["a", "b", "c"],
      });
    });
  });
});
