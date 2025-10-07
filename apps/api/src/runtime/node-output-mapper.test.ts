import type { Workflow } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { NodeOutputMapper } from "./node-output-mapper";
import type { ObjectStore } from "./object-store";
import type { RuntimeState } from "./runtime";

// Mock the parameter mapper module
vi.mock("../nodes/parameter-mapper", () => ({
  nodeToApiParameter: vi.fn(async (type, value) => {
    // Simple mock that returns the value as-is for most types
    if (type === "object") {
      return { id: "mock-object-ref", mimeType: "application/octet-stream" };
    }
    return value;
  }),
}));

describe("NodeOutputMapper", () => {
  describe("mapNodeToRuntimeOutputs", () => {
    it("should map basic output values", async () => {
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
              inputs: [],
              outputs: [
                { name: "text", type: "string" },
                { name: "count", type: "number" },
              ],
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

      const mapper = new NodeOutputMapper();
      const mockStore = {} as ObjectStore;

      const result = await mapper.mapNodeToRuntimeOutputs(
        runtimeState,
        "A",
        { text: "hello", count: 42 },
        mockStore,
        "org-123",
        "exec-456"
      );

      expect(result).toEqual({
        text: "hello",
        count: 42,
      });
    });

    it("should skip undefined and null output values", async () => {
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
              outputs: [
                { name: "output1", type: "string" },
                { name: "output2", type: "string" },
                { name: "output3", type: "string" },
              ],
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

      const mapper = new NodeOutputMapper();
      const mockStore = {} as ObjectStore;

      const result = await mapper.mapNodeToRuntimeOutputs(
        runtimeState,
        "A",
        { output1: "value", output2: undefined, output3: null },
        mockStore,
        "org-123",
        "exec-456"
      );

      expect(result).toEqual({
        output1: "value",
      });
    });

    it("should throw error when node not found", async () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-3",
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

      const mapper = new NodeOutputMapper();
      const mockStore = {} as ObjectStore;

      await expect(
        mapper.mapNodeToRuntimeOutputs(
          runtimeState,
          "NonExistent",
          {},
          mockStore,
          "org-123",
          "exec-456"
        )
      ).rejects.toThrow("Node NonExistent not found");
    });

    it("should handle multiple output types", async () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-4",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "multi",
              inputs: [],
              outputs: [
                { name: "text", type: "string" },
                { name: "number", type: "number" },
                { name: "bool", type: "boolean" },
                { name: "json", type: "json" },
              ],
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

      const mapper = new NodeOutputMapper();
      const mockStore = {} as ObjectStore;

      const result = await mapper.mapNodeToRuntimeOutputs(
        runtimeState,
        "A",
        {
          text: "hello",
          number: 42,
          bool: true,
          json: { key: "value" },
        },
        mockStore,
        "org-123",
        "exec-456"
      );

      expect(result).toEqual({
        text: "hello",
        number: 42,
        bool: true,
        json: { key: "value" },
      });
    });

    it("should handle empty outputs object", async () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-5",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "text",
              inputs: [],
              outputs: [{ name: "output", type: "string" }],
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

      const mapper = new NodeOutputMapper();
      const mockStore = {} as ObjectStore;

      const result = await mapper.mapNodeToRuntimeOutputs(
        runtimeState,
        "A",
        {},
        mockStore,
        "org-123",
        "exec-456"
      );

      expect(result).toEqual({});
    });

    it("should handle outputs with no matching values", async () => {
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
              inputs: [],
              outputs: [
                { name: "output1", type: "string" },
                { name: "output2", type: "string" },
              ],
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

      const mapper = new NodeOutputMapper();
      const mockStore = {} as ObjectStore;

      const result = await mapper.mapNodeToRuntimeOutputs(
        runtimeState,
        "A",
        { someOtherOutput: "value" },
        mockStore,
        "org-123",
        "exec-456"
      );

      expect(result).toEqual({});
    });
  });
});
