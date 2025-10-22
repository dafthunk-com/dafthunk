import type { Workflow } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { ConditionalExecutionHandler } from "./conditional-execution-handler";
import type { InputCollector } from "./input-collector";
import type { RuntimeState } from "./runtime";
import type { WorkflowRuntimeState } from "./types";

describe("ConditionalExecutionHandler", () => {
  const createMockRegistry = (
    nodeTypes: Record<
      string,
      { inputs?: Array<{ name: string; required?: boolean }> }
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

  const createMockInputCollector = (
    inputResults: Record<string, Record<string, any>>
  ): InputCollector => {
    return {
      collectNodeInputs: vi.fn((_workflow, _nodeOutputs, nodeId) => {
        return inputResults[nodeId] || {};
      }),
    } as any;
  };

  describe("markInactiveOutputNodesAsSkipped", () => {
    it("should not mark any nodes when all outputs are active", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-1",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "conditional",
              inputs: [],
              outputs: [
                { name: "true", type: "string" },
                { name: "false", type: "string" },
              ],
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
              sourceOutput: "true",
              target: "B",
              targetInput: "input",
            },
          ],
        } as unknown as Workflow,
        nodeOutputs: new Map([["A", { true: "yes", false: "no" }]]),
        executedNodes: new Set(["A"]),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({
        conditional: {
          inputs: [],
        },
        text: { inputs: [{ name: "input", required: true }] },
      });
      const inputCollector = createMockInputCollector({
        B: { input: "yes" },
      });
      const handler = new ConditionalExecutionHandler(registry, inputCollector);

      const result = handler.markInactiveOutputNodesAsSkipped(
        runtimeState,
        "A",
        { true: "yes", false: "no" }
      );

      expect(result.skippedNodes.size).toBe(0);
    });

    it("should mark nodes connected to inactive outputs as skipped", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-2",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "conditional",
              inputs: [],
              outputs: [
                { name: "true", type: "string" },
                { name: "false", type: "string" },
              ],
            },
            {
              id: "B",
              type: "text",
              inputs: [{ name: "input", type: "string", required: true }],
              outputs: [],
            },
            {
              id: "C",
              type: "text",
              inputs: [{ name: "input", type: "string", required: true }],
              outputs: [],
            },
          ],
          edges: [
            {
              source: "A",
              sourceOutput: "true",
              target: "B",
              targetInput: "input",
            },
            {
              source: "A",
              sourceOutput: "false",
              target: "C",
              targetInput: "input",
            },
          ],
        } as unknown as Workflow,
        nodeOutputs: new Map([["A", { true: "yes" }]]), // only "true" output
        executedNodes: new Set(["A"]),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({
        conditional: { inputs: [] },
        text: { inputs: [{ name: "input", required: true }] },
      });
      const inputCollector = createMockInputCollector({
        B: { input: "yes" },
        C: {}, // No input from A's false output
      });
      const handler = new ConditionalExecutionHandler(registry, inputCollector);

      const result = handler.markInactiveOutputNodesAsSkipped(
        runtimeState,
        "A",
        { true: "yes" } // "false" output is inactive
      );

      expect(result.skippedNodes.has("C")).toBe(true);
      expect(result.skippedNodes.has("B")).toBe(false);
    });

    it("should recursively skip dependent nodes", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-3",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "conditional",
              inputs: [],
              outputs: [
                { name: "true", type: "string" },
                { name: "false", type: "string" },
              ],
            },
            {
              id: "B",
              type: "text",
              inputs: [{ name: "input", type: "string", required: true }],
              outputs: [{ name: "output", type: "string" }],
            },
            {
              id: "C",
              type: "text",
              inputs: [{ name: "input", type: "string", required: true }],
              outputs: [],
            },
          ],
          edges: [
            {
              source: "A",
              sourceOutput: "false",
              target: "B",
              targetInput: "input",
            },
            {
              source: "B",
              sourceOutput: "output",
              target: "C",
              targetInput: "input",
            },
          ],
        } as unknown as Workflow,
        nodeOutputs: new Map([["A", { true: "yes" }]]),
        executedNodes: new Set(["A"]),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({
        conditional: { inputs: [] },
        text: { inputs: [{ name: "input", required: true }] },
      });
      const inputCollector = createMockInputCollector({
        B: {}, // No input
        C: {}, // No input (because B will be skipped)
      });
      const handler = new ConditionalExecutionHandler(registry, inputCollector);

      const result = handler.markInactiveOutputNodesAsSkipped(
        runtimeState,
        "A",
        { true: "yes" }
      );

      // Both B and C should be skipped
      expect(result.skippedNodes.has("B")).toBe(true);
      expect(result.skippedNodes.has("C")).toBe(true);
    });

    it("should not skip nodes with optional inputs", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-4",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "conditional",
              inputs: [],
              outputs: [
                { name: "true", type: "string" },
                { name: "false", type: "string" },
              ],
            },
            {
              id: "B",
              type: "text",
              inputs: [{ name: "input", type: "string", required: false }],
              outputs: [],
            },
          ],
          edges: [
            {
              source: "A",
              sourceOutput: "false",
              target: "B",
              targetInput: "input",
            },
          ],
        } as unknown as Workflow,
        nodeOutputs: new Map([["A", { true: "yes" }]]),
        executedNodes: new Set(["A"]),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({
        conditional: { inputs: [] },
        text: { inputs: [{ name: "input", required: false }] }, // Optional!
      });
      const inputCollector = createMockInputCollector({
        B: {}, // No input, but it's optional
      });
      const handler = new ConditionalExecutionHandler(registry, inputCollector);

      const result = handler.markInactiveOutputNodesAsSkipped(
        runtimeState,
        "A",
        { true: "yes" }
      );

      // B should NOT be skipped because input is optional
      expect(result.skippedNodes.has("B")).toBe(false);
    });

    it("should not skip nodes with alternative valid inputs", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-5",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "conditional",
              inputs: [],
              outputs: [
                { name: "true", type: "string" },
                { name: "false", type: "string" },
              ],
            },
            {
              id: "B",
              type: "text",
              inputs: [],
              outputs: [{ name: "output", type: "string" }],
            },
            {
              id: "C",
              type: "merge",
              inputs: [
                { name: "input1", type: "string", required: true },
                { name: "input2", type: "string", required: false },
              ],
              outputs: [],
            },
          ],
          edges: [
            {
              source: "A",
              sourceOutput: "false",
              target: "C",
              targetInput: "input2",
            },
            {
              source: "B",
              sourceOutput: "output",
              target: "C",
              targetInput: "input1",
            },
          ],
        } as unknown as Workflow,
        nodeOutputs: new Map([
          ["A", { true: "yes" }],
          ["B", { output: "from B" }],
        ]) as unknown as WorkflowRuntimeState,
        executedNodes: new Set(["A", "B"]),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({
        conditional: { inputs: [] },
        text: { inputs: [] },
        merge: {
          inputs: [
            { name: "input1", required: true },
            { name: "input2", required: false },
          ],
        },
      });
      const inputCollector = createMockInputCollector({
        C: { input1: "from B" }, // Has required input from B
      });
      const handler = new ConditionalExecutionHandler(registry, inputCollector);

      const result = handler.markInactiveOutputNodesAsSkipped(
        runtimeState,
        "A",
        { true: "yes" }
      );

      // C should NOT be skipped because it has input1 from B
      expect(result.skippedNodes.has("C")).toBe(false);
    });

    it("should handle node not found", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-6",
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
      const inputCollector = createMockInputCollector({});
      const handler = new ConditionalExecutionHandler(registry, inputCollector);

      const result = handler.markInactiveOutputNodesAsSkipped(
        runtimeState,
        "NonExistent",
        {}
      );

      expect(result).toBe(runtimeState);
    });

    it("should handle node with no outputs", () => {
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
              inputs: [],
              outputs: [],
            },
          ],
          edges: [],
        } as unknown as Workflow,
        nodeOutputs: new Map([["A", {}]]),
        executedNodes: new Set(["A"]),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const registry = createMockRegistry({
        text: { inputs: [] },
      });
      const inputCollector = createMockInputCollector({});
      const handler = new ConditionalExecutionHandler(registry, inputCollector);

      const result = handler.markInactiveOutputNodesAsSkipped(
        runtimeState,
        "A",
        {}
      );

      expect(result.skippedNodes.size).toBe(0);
    });
  });
});
