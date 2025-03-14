import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { WorkflowRuntime } from "./workflowRuntime";
import { Workflow, WorkflowExecutionOptions } from "./workflowTypes";
import { validateWorkflow } from "./workflowValidation";
import { registerNodes } from "./nodes/nodeRegistry";

// Mock the validateWorkflow function
vi.mock("./workflowValidation", () => ({
  validateWorkflow: vi.fn().mockReturnValue([]),
}));

// Mock the base nodes registration
vi.mock("./nodes/nodeRegistry", () => ({
  registerNodes: vi.fn(),
}));

// Mock the NodeRegistry for the unregistered node type test
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
    // Reset mocks between tests
    vi.clearAllMocks();

    // Reset validateWorkflow mock to return empty array by default
    (validateWorkflow as any).mockReset();
    (validateWorkflow as any).mockReturnValue([]);
  });

  it("should detect cycles in workflows", async () => {
    // Create a workflow with a cycle
    const workflow: Workflow = {
      id: "cycle-workflow",
      name: "Workflow with Cycle",
      nodes: [
        {
          id: "node-1",
          name: "Node 1",
          type: "start",
          position: { x: 100, y: 100 },
          inputs: [{ name: "input1", type: "string" }],
          outputs: [{ name: "output1", type: "string", value: "Hello" }],
        },
        {
          id: "node-2",
          name: "Node 2",
          type: "function",
          position: { x: 300, y: 100 },
          inputs: [{ name: "input1", type: "string" }],
          outputs: [{ name: "output1", type: "string" }],
        },
        {
          id: "node-3",
          name: "Node 3",
          type: "function",
          position: { x: 500, y: 100 },
          inputs: [{ name: "input1", type: "string" }],
          outputs: [{ name: "output1", type: "string" }],
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

    // Mock validateWorkflow to return a cycle error
    (validateWorkflow as any).mockReturnValueOnce([
      {
        type: "CYCLE_DETECTED",
        message: "Cycle detected in workflow",
        details: { nodeId: "node-1" },
      },
    ]);

    const runtime = new WorkflowRuntime(workflow);
    const errors = await runtime.validate();

    // Check that a cycle was detected
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.type === "CYCLE_DETECTED")).toBe(true);
  });

  it("should detect type mismatches in connections", async () => {
    // Create a workflow with type mismatches
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
          outputs: [{ name: "output1", type: "number", value: 42 }],
        },
        {
          id: "node-2",
          name: "Node 2",
          type: "function",
          position: { x: 300, y: 100 },
          inputs: [
            { name: "input1", type: "string" }, // String type, but will receive number
          ],
          outputs: [{ name: "output1", type: "string" }],
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

    // Mock validateWorkflow to return a type mismatch error
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

    const runtime = new WorkflowRuntime(workflow);
    const errors = await runtime.validate();

    // Check that a type mismatch was detected
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.type === "TYPE_MISMATCH")).toBe(true);
  });

  it("should detect duplicate connections", async () => {
    // Create a workflow with duplicate connections
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
          outputs: [{ name: "output1", type: "string", value: "Hello" }],
        },
        {
          id: "node-2",
          name: "Node 2",
          type: "function",
          position: { x: 300, y: 100 },
          inputs: [{ name: "input1", type: "string" }],
          outputs: [{ name: "output1", type: "string" }],
        },
      ],
      edges: [
        {
          source: "node-1",
          target: "node-2",
          sourceOutput: "output1",
          targetInput: "input1",
        },
        // Duplicate connection
        {
          source: "node-1",
          target: "node-2",
          sourceOutput: "output1",
          targetInput: "input1",
        },
      ],
    };

    // Mock validateWorkflow to return a duplicate connection error
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

    const runtime = new WorkflowRuntime(workflow);
    const errors = await runtime.validate();

    // Check that a duplicate connection was detected
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.type === "DUPLICATE_CONNECTION")).toBe(true);
  });

  it("should detect unregistered node types", async () => {
    // Create a workflow with an unregistered node type
    const workflow: Workflow = {
      id: "unregistered-node-workflow",
      name: "Workflow with Unregistered Node",
      nodes: [
        {
          id: "node-1",
          name: "Node 1",
          type: "start",
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [{ name: "output1", type: "string", value: "Hello" }],
        },
        {
          id: "node-2",
          name: "Node 2",
          type: "unknown-type", // Unregistered type
          position: { x: 300, y: 100 },
          inputs: [{ name: "input1", type: "string" }],
          outputs: [{ name: "output1", type: "string" }],
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

    const runtime = new WorkflowRuntime(workflow);
    const errors = await runtime.validate();

    // Check that an unregistered node type was detected
    expect(errors.length).toBeGreaterThan(0);
    expect(
      errors.some((e) =>
        e.message.includes("Node type 'unknown-type' is not registered")
      )
    ).toBe(true);
  });

  it("should validate a valid workflow without errors", async () => {
    // Create a valid workflow
    const workflow: Workflow = {
      id: "valid-workflow",
      name: "Valid Workflow",
      nodes: [
        {
          id: "node-1",
          name: "Start Node",
          type: "start",
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [{ name: "output1", type: "string", value: "Hello" }],
        },
        {
          id: "node-2",
          name: "End Node",
          type: "end",
          position: { x: 300, y: 100 },
          inputs: [{ name: "input1", type: "string" }],
          outputs: [],
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

    // Mock validateWorkflow to return no errors
    (validateWorkflow as any).mockReturnValueOnce([]);

    const runtime = new WorkflowRuntime(workflow);
    const errors = await runtime.validate();

    // Check that no errors were detected
    expect(errors.length).toBe(0);
  });

  it("should prevent execution of invalid workflows", async () => {
    // Create an invalid workflow with a cycle
    const workflow: Workflow = {
      id: "invalid-workflow",
      name: "Invalid Workflow",
      nodes: [
        {
          id: "node-1",
          name: "Node 1",
          type: "start",
          position: { x: 100, y: 100 },
          inputs: [{ name: "input1", type: "string" }],
          outputs: [{ name: "output1", type: "string", value: "Hello" }],
        },
        {
          id: "node-2",
          name: "Node 2",
          type: "function",
          position: { x: 300, y: 100 },
          inputs: [{ name: "input1", type: "string" }],
          outputs: [{ name: "output1", type: "string" }],
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
          target: "node-1",
          sourceOutput: "output1",
          targetInput: "input1",
        },
      ],
    };

    // Mock validateWorkflow to return a cycle error
    (validateWorkflow as any).mockReturnValueOnce([
      {
        type: "CYCLE_DETECTED",
        message: "Cycle detected in workflow",
        details: { nodeId: "node-1" },
      },
    ]);

    const onExecutionError = vi.fn();
    const options: WorkflowExecutionOptions = {
      onExecutionError,
    };

    const runtime = new WorkflowRuntime(workflow, options);

    // Execution should fail with an error
    await expect(runtime.execute()).rejects.toThrow(
      "Workflow validation failed"
    );
    expect(onExecutionError).toHaveBeenCalled();
  });
});
