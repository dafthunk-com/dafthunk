import { describe, it, expect, beforeEach, vi } from "vitest";
import { Runtime } from "./runtime";
import { Workflow, WorkflowExecutionOptions } from "./types";
import { NodeRegistry } from "./registries";
import {
  StartNode,
  ProcessNode,
  ErrorNode,
  LongRunningNode,
} from "../nodes/test/testNodes";
import { StringValue } from "./types";

// Mock the ParameterTypeRegistry
vi.mock("./typeRegistry", () => ({
  ParameterTypeRegistry: {
    getInstance: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue({
        validate: vi.fn().mockReturnValue({ isValid: true }),
        serialize: vi.fn((value) => value),
        deserialize: vi.fn((value) => value),
      }),
    }),
  },
}));

// Register test nodes
const registry = NodeRegistry.getInstance();
registry.registerImplementation(StartNode);
registry.registerImplementation(ProcessNode);
registry.registerImplementation(ErrorNode);
registry.registerImplementation(LongRunningNode);

describe("WorkflowRuntime Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should execute a simple workflow", async () => {
    const workflow: Workflow = {
      id: "simple-workflow",
      name: "Simple Workflow",
      nodes: [
        {
          id: "start-node",
          name: "Start Node",
          type: "start",
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [
            {
              name: "output",
              type: StringValue,
              value: new StringValue("Hello"),
            },
          ],
        },
        {
          id: "process-node",
          name: "Process Node",
          type: "process",
          position: { x: 300, y: 100 },
          inputs: [{ name: "input", type: StringValue }],
          outputs: [{ name: "output", type: StringValue }],
        },
      ],
      edges: [
        {
          source: "start-node",
          target: "process-node",
          sourceOutput: "output",
          targetInput: "input",
        },
      ],
    };

    const executedNodes: string[] = [];
    const nodeOutputs: Record<string, any> = {};

    const options: WorkflowExecutionOptions = {
      onNodeComplete: (nodeId, outputs) => {
        executedNodes.push(nodeId);
        nodeOutputs[nodeId] = outputs;
      },
    };

    const runtime = new Runtime(workflow, options);
    await runtime.execute();

    expect(executedNodes).toHaveLength(2);
    expect(executedNodes[0]).toBe("start-node");
    expect(executedNodes[1]).toBe("process-node");
    expect(nodeOutputs["start-node"]).toHaveProperty(
      "output",
      "Hello from start node"
    );
  });

  it("should handle node execution errors", async () => {
    const workflow: Workflow = {
      id: "error-workflow",
      name: "Error Workflow",
      nodes: [
        {
          id: "error-node",
          name: "Error Node",
          type: "error",
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [],
        },
      ],
      edges: [],
    };

    const nodeErrors: Record<string, string> = {};

    const options: WorkflowExecutionOptions = {
      onNodeError: (nodeId, error) => {
        nodeErrors[nodeId] = error;
      },
    };

    const runtime = new Runtime(workflow, options);
    await runtime.execute();

    expect(nodeErrors["error-node"]).toBeDefined();
    const state = runtime.getExecutionState();
    expect(state.errorNodes.has("error-node")).toBe(true);
  });

  it("should handle workflow abort", async () => {
    const workflow: Workflow = {
      id: "abort-workflow",
      name: "Abort Workflow",
      nodes: [
        {
          id: "long-running-node",
          name: "Long Running Node",
          type: "long-running",
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [],
        },
      ],
      edges: [],
    };

    const abortController = new AbortController();

    const options: WorkflowExecutionOptions = {
      abortSignal: abortController.signal,
    };

    const runtime = new Runtime(workflow, options);
    const executePromise = runtime.execute();

    // Abort the execution
    abortController.abort();

    const result = await executePromise;
    expect(result).toBeInstanceOf(Map);

    const state = runtime.getExecutionState();
    expect(state.aborted).toBe(true);
  });

  it("should handle parallel node execution", async () => {
    const workflow: Workflow = {
      id: "parallel-workflow",
      name: "Parallel Workflow",
      nodes: [
        {
          id: "start-node",
          name: "Start Node",
          type: "start",
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [
            {
              name: "output1",
              type: StringValue,
              value: new StringValue("Hello 1"),
            },
            {
              name: "output2",
              type: StringValue,
              value: new StringValue("Hello 2"),
            },
          ],
        },
        {
          id: "process-node-1",
          name: "Process Node 1",
          type: "process",
          position: { x: 300, y: 50 },
          inputs: [{ name: "input", type: StringValue }],
          outputs: [{ name: "output", type: StringValue }],
        },
        {
          id: "process-node-2",
          name: "Process Node 2",
          type: "process",
          position: { x: 300, y: 150 },
          inputs: [{ name: "input", type: StringValue }],
          outputs: [{ name: "output", type: StringValue }],
        },
      ],
      edges: [
        {
          source: "start-node",
          target: "process-node-1",
          sourceOutput: "output1",
          targetInput: "input",
        },
        {
          source: "start-node",
          target: "process-node-2",
          sourceOutput: "output2",
          targetInput: "input",
        },
      ],
    };

    const executedNodes: string[] = [];

    const options: WorkflowExecutionOptions = {
      onNodeComplete: (nodeId) => {
        executedNodes.push(nodeId);
      },
    };

    const runtime = new Runtime(workflow, options);
    await runtime.execute();

    expect(executedNodes).toHaveLength(3);
    expect(executedNodes[0]).toBe("start-node");
    // Process nodes can execute in any order
    expect(executedNodes.slice(1)).toContain("process-node-1");
    expect(executedNodes.slice(1)).toContain("process-node-2");
  });
});
