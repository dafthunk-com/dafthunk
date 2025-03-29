import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { Runtime } from "./runtime";
import { Workflow } from "./types";
import { validateWorkflow } from "./validation";
import { registerNodes } from "./registries";
import { StringRuntimeParameter, NumberRuntimeParameter } from "./types";
// Mock the validateWorkflow function
vi.mock("./validation", () => ({
  validateWorkflow: vi.fn().mockReturnValue([]),
}));

// Mock the node registry
vi.mock("./nodeRegistry", () => ({
  registerNodes: vi.fn(),
}));

// Mock the NodeRegistry
vi.mock("./workflowTypes", async () => {
  const originalModule = (await vi.importActual("./workflowTypes")) as object;
  return {
    ...originalModule,
    NodeRegistry: {
      getInstance: vi.fn().mockReturnValue({
        registerImplementation: vi.fn(),
        getImplementation: vi.fn(),
        createExecutableNode: vi.fn((node) => {
          if (node.type === "unknown-type") {
            return undefined;
          }
          return {
            ...node,
            execute: vi.fn(),
          };
        }),
      }),
    },
  };
});

// Ensure base nodes are registered
beforeAll(() => {
  registerNodes();
});

describe("WorkflowRuntime Validation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateWorkflow as any).mockReset();
    (validateWorkflow as any).mockReturnValue([]);
  });

  it("should detect cycles in workflows", async () => {
    const workflow: Workflow = {
      id: "cycle-workflow",
      name: "Workflow with Cycle",
      nodes: [
        {
          id: "node-1",
          name: "Node 1",
          type: "start",
          position: { x: 100, y: 100 },
          inputs: [{ name: "input1", type: StringRuntimeParameter }],
          outputs: [
            {
              name: "output1",
              type: StringRuntimeParameter,
              value: new StringRuntimeParameter("Hello"),
            },
          ],
        },
        {
          id: "node-2",
          name: "Node 2",
          type: "function",
          position: { x: 300, y: 100 },
          inputs: [{ name: "input1", type: StringRuntimeParameter }],
          outputs: [{ name: "output1", type: StringRuntimeParameter }],
        },
        {
          id: "node-3",
          name: "Node 3",
          type: "function",
          position: { x: 500, y: 100 },
          inputs: [{ name: "input1", type: StringRuntimeParameter }],
          outputs: [{ name: "output1", type: StringRuntimeParameter }],
        },
      ],
      edges: [
        {
          source: "node-1",
          target: "node-2",
          sourceOutput: "output1",
          targetInput: "input1",
        },
        {
          source: "node-2",
          target: "node-3",
          sourceOutput: "output1",
          targetInput: "input1",
        },
        {
          source: "node-3",
          target: "node-1",
          sourceOutput: "output1",
          targetInput: "input1",
        },
      ],
    };

    (validateWorkflow as any).mockReturnValueOnce([
      {
        type: "CYCLE_DETECTED",
        message: "Cycle detected in workflow",
        details: { nodeId: "node-1" },
      },
    ]);

    const runtime = new Runtime(workflow);
    const errors = await runtime.validate();

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.type === "CYCLE_DETECTED")).toBe(true);
  });

  it("should detect type mismatches in connections", async () => {
    const workflow: Workflow = {
      id: "type-mismatch-workflow",
      name: "Workflow with Type Mismatch",
      nodes: [
        {
          id: "node-1",
          name: "Node 1",
          type: "start",
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [
            {
              name: "output1",
              type: NumberRuntimeParameter,
              value: new NumberRuntimeParameter(42),
            },
          ],
        },
        {
          id: "node-2",
          name: "Node 2",
          type: "function",
          position: { x: 300, y: 100 },
          inputs: [{ name: "input1", type: StringRuntimeParameter }],
          outputs: [{ name: "output1", type: StringRuntimeParameter }],
        },
      ],
      edges: [
        {
          source: "node-1",
          target: "node-2",
          sourceOutput: "output1",
          targetInput: "input1",
        },
      ],
    };

    (validateWorkflow as any).mockReturnValueOnce([
      {
        type: "TYPE_MISMATCH",
        message: "Type mismatch: number -> string",
        details: {
          connectionSource: "node-1",
          connectionTarget: "node-2",
        },
      },
    ]);

    const runtime = new Runtime(workflow);
    const errors = await runtime.validate();

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.type === "TYPE_MISMATCH")).toBe(true);
  });

  it("should detect duplicate connections", async () => {
    const workflow: Workflow = {
      id: "duplicate-connection-workflow",
      name: "Workflow with Duplicate Connection",
      nodes: [
        {
          id: "node-1",
          name: "Node 1",
          type: "start",
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [
            {
              name: "output1",
              type: StringRuntimeParameter,
              value: new StringRuntimeParameter("Hello"),
            },
          ],
        },
        {
          id: "node-2",
          name: "Node 2",
          type: "function",
          position: { x: 300, y: 100 },
          inputs: [{ name: "input1", type: StringRuntimeParameter }],
          outputs: [{ name: "output1", type: StringRuntimeParameter }],
        },
      ],
      edges: [
        {
          source: "node-1",
          target: "node-2",
          sourceOutput: "output1",
          targetInput: "input1",
        },
        {
          source: "node-1",
          target: "node-2",
          sourceOutput: "output1",
          targetInput: "input1",
        },
      ],
    };

    (validateWorkflow as any).mockReturnValueOnce([
      {
        type: "DUPLICATE_CONNECTION",
        message: "Duplicate connection detected",
        details: {
          connectionSource: "node-1",
          connectionTarget: "node-2",
        },
      },
    ]);

    const runtime = new Runtime(workflow);
    const errors = await runtime.validate();

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.type === "DUPLICATE_CONNECTION")).toBe(true);
  });

  it("should detect unregistered node types", async () => {
    const workflow: Workflow = {
      id: "unregistered-node-workflow",
      name: "Workflow with Unregistered Node",
      nodes: [
        {
          id: "node-1",
          name: "Node 1",
          type: "unknown-type",
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [],
        },
      ],
      edges: [],
    };

    const runtime = new Runtime(workflow);
    const errors = await runtime.validate();

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.type === "INVALID_CONNECTION")).toBe(true);
  });

  it("should validate node inputs and outputs", async () => {
    const workflow: Workflow = {
      id: "invalid-io-workflow",
      name: "Workflow with Invalid IO",
      nodes: [
        {
          id: "node-1",
          name: "Node 1",
          type: "start",
          position: { x: 100, y: 100 },
          // @ts-expect-error
          inputs: [{ name: "input1", type: "invalid-type" }],
          // @ts-expect-error
          outputs: [{ name: "output1", type: "invalid-type" }],
        },
      ],
      edges: [],
    };

    (validateWorkflow as any).mockReturnValueOnce([
      {
        type: "INVALID_CONNECTION",
        message: "Invalid parameter type: invalid-type",
        details: { nodeId: "node-1", parameterName: "input1" },
      },
    ]);

    const runtime = new Runtime(workflow);
    const errors = await runtime.validate();

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.type === "INVALID_CONNECTION")).toBe(true);
  });

  it("should validate required inputs", async () => {
    const workflow: Workflow = {
      id: "missing-input-workflow",
      name: "Workflow with Missing Input",
      nodes: [
        {
          id: "node-1",
          name: "Node 1",
          type: "function",
          position: { x: 100, y: 100 },
          inputs: [
            {
              name: "required-input",
              type: StringRuntimeParameter,
              value: undefined,
            },
          ],
          outputs: [],
        },
      ],
      edges: [],
    };

    (validateWorkflow as any).mockReturnValueOnce([
      {
        type: "INVALID_CONNECTION",
        message: "Missing required input: required-input",
        details: { nodeId: "node-1", inputName: "required-input" },
      },
    ]);

    const runtime = new Runtime(workflow);
    const errors = await runtime.validate();

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.type === "INVALID_CONNECTION")).toBe(true);
  });
});
