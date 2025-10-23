import type { Workflow } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { SkipHandler } from "./skip-handler";
import type { InputCollector } from "./input-collector";
import type { ExecutionState, WorkflowExecutionContext } from "./types";

describe("SkipHandler", () => {
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

  const createContext = (workflow: Workflow): WorkflowExecutionContext => ({
    workflow,
    executionPlan: [],
    workflowId: workflow.id,
    organizationId: "test-org",
    executionId: "test-exec",
  });

  const createState = (
    nodeOutputs: Map<string, any>,
    executedNodes: Set<string>,
    skippedNodes: Set<string>,
    nodeErrors: Map<string, string>
  ): ExecutionState => ({
    nodeOutputs,
    executedNodes,
    skippedNodes,
    nodeErrors,
    status: "executing",
  });

  describe("skipInactiveOutputs", () => {
    it("should not mark any nodes when all outputs are active", () => {
      const workflow: Workflow = {
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
      } as unknown as Workflow;

      const context = createContext(workflow);
      const state = createState(
        new Map([["A", { true: "yes", false: "no" }]]),
        new Set(["A"]),
        new Set(),
        new Map()
      );

      const registry = createMockRegistry({
        conditional: {
          inputs: [],
        },
        text: { inputs: [{ name: "input", required: true }] },
      });
      const inputCollector = createMockInputCollector({
        B: { input: "yes" },
      });
      const handler = new SkipHandler(registry, inputCollector);

      const result = handler.skipInactiveOutputs(
        context,
        state,
        "A",
        { true: "yes", false: "no" }
      );

      expect(result.skippedNodes.size).toBe(0);
    });

    it("should mark nodes connected to inactive outputs as skipped", () => {
      const workflow: Workflow = {
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
      } as unknown as Workflow;

      const context = createContext(workflow);
      const state = createState(
        new Map([["A", { true: "yes" }]]), // only "true" output
        new Set(["A"]),
        new Set(),
        new Map()
      );

      const registry = createMockRegistry({
        conditional: { inputs: [] },
        text: { inputs: [{ name: "input", required: true }] },
      });
      const inputCollector = createMockInputCollector({
        B: { input: "yes" },
        C: {}, // No input from A's false output
      });
      const handler = new SkipHandler(registry, inputCollector);

      const result = handler.skipInactiveOutputs(
        context,
        state,
        "A",
        { true: "yes" } // "false" output is inactive
      );

      expect(result.skippedNodes.has("C")).toBe(true);
      expect(result.skippedNodes.has("B")).toBe(false);
    });

    it("should recursively skip dependent nodes", () => {
      const workflow: Workflow = {
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
      } as unknown as Workflow;

      const context = createContext(workflow);
      const state = createState(
        new Map([["A", { true: "yes" }]]),
        new Set(["A"]),
        new Set(),
        new Map()
      );

      const registry = createMockRegistry({
        conditional: { inputs: [] },
        text: { inputs: [{ name: "input", required: true }] },
      });
      const inputCollector = createMockInputCollector({
        B: {}, // No input
        C: {}, // No input (because B will be skipped)
      });
      const handler = new SkipHandler(registry, inputCollector);

      const result = handler.skipInactiveOutputs(
        context,
        state,
        "A",
        { true: "yes" }
      );

      // Both B and C should be skipped
      expect(result.skippedNodes.has("B")).toBe(true);
      expect(result.skippedNodes.has("C")).toBe(true);
    });

    it("should not skip nodes with optional inputs", () => {
      const workflow: Workflow = {
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
      } as unknown as Workflow;

      const context = createContext(workflow);
      const state = createState(
        new Map([["A", { true: "yes" }]]),
        new Set(["A"]),
        new Set(),
        new Map()
      );

      const registry = createMockRegistry({
        conditional: { inputs: [] },
        text: { inputs: [{ name: "input", required: false }] }, // Optional!
      });
      const inputCollector = createMockInputCollector({
        B: {}, // No input, but it's optional
      });
      const handler = new SkipHandler(registry, inputCollector);

      const result = handler.skipInactiveOutputs(
        context,
        state,
        "A",
        { true: "yes" }
      );

      // B should NOT be skipped because input is optional
      expect(result.skippedNodes.has("B")).toBe(false);
    });

    it("should not skip nodes with alternative valid inputs", () => {
      const workflow: Workflow = {
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
      } as unknown as Workflow;

      const context = createContext(workflow);
      const state = createState(
        new Map([
          ["A", { true: "yes" }],
          ["B", { output: "from B" }],
        ]),
        new Set(["A", "B"]),
        new Set(),
        new Map()
      );

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
      const handler = new SkipHandler(registry, inputCollector);

      const result = handler.skipInactiveOutputs(
        context,
        state,
        "A",
        { true: "yes" }
      );

      // C should NOT be skipped because it has input1 from B
      expect(result.skippedNodes.has("C")).toBe(false);
    });

    it("should handle node not found", () => {
      const workflow: Workflow = {
        id: "workflow-6",
        name: "Test Workflow",
        handle: "test-workflow",
        type: "manual",
        nodes: [],
        edges: [],
      } as unknown as Workflow;

      const context = createContext(workflow);
      const state = createState(new Map(), new Set(), new Set(), new Map());

      const registry = createMockRegistry({});
      const inputCollector = createMockInputCollector({});
      const handler = new SkipHandler(registry, inputCollector);

      const result = handler.skipInactiveOutputs(
        context,
        state,
        "NonExistent",
        {}
      );

      expect(result).toBe(state);
    });

    it("should handle node with no outputs", () => {
      const workflow: Workflow = {
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
      } as unknown as Workflow;

      const context = createContext(workflow);
      const state = createState(
        new Map([["A", {}]]),
        new Set(["A"]),
        new Set(),
        new Map()
      );

      const registry = createMockRegistry({
        text: { inputs: [] },
      });
      const inputCollector = createMockInputCollector({});
      const handler = new SkipHandler(registry, inputCollector);

      const result = handler.skipInactiveOutputs(
        context,
        state,
        "A",
        {}
      );

      expect(result.skippedNodes.size).toBe(0);
    });
  });
});
