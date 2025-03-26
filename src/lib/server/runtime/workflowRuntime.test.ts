import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from "vitest";
import { WorkflowRuntime } from "./workflowRuntime";
import {
  Workflow,
  Node,
  NodeRegistry,
  WorkflowExecutionOptions,
  NodeContext,
  ExecutionResult,
  NodeType,
} from "./workflowTypes";
import { validateWorkflow } from "./workflowValidation";
import { BaseExecutableNode } from "./nodes/baseNode";
import { StartNode, ProcessNode } from "./nodes/test/testNodes";

// Mock the validateWorkflow function
vi.mock("./workflowValidation", () => ({
  validateWorkflow: vi.fn().mockReturnValue([]),
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
          if (node.type === "failing") {
            return new FailingMockExecutableNode(node);
          }
          if (node.type === "start") {
            return new StartNode(node);
          }
          if (node.type === "process") {
            return new ProcessNode(node);
          }
          return new MockExecutableNode(node);
        }),
      }),
    },
  };
});

// Create a mock node implementation for testing
class MockExecutableNode extends BaseExecutableNode {
  static readonly nodeType: NodeType = {
    id: "mock",
    name: "Mock Node",
    type: "mock",
    description: "A mock node for testing",
    category: "Test",
    icon: "test",
    inputs: [],
    outputs: [],
  };

  executeMock: ReturnType<typeof vi.fn>;

  constructor(node: Node) {
    super(node);
    this.executeMock = vi.fn().mockResolvedValue({
      success: true,
      outputs: { result: `Output from ${node.id}` },
    });
  }

  async execute(context: NodeContext): Promise<ExecutionResult> {
    return this.executeMock(context);
  }
}

// Create a mock node implementation that fails
class FailingMockExecutableNode extends MockExecutableNode {
  constructor(node: Node) {
    super(node);
    this.executeMock = vi.fn().mockResolvedValue({
      success: false,
      error: `Error executing node ${node.id}`,
    });
  }
}

// Add these hooks at the top level
let originalConsoleError: typeof console.error;

beforeAll(() => {
  originalConsoleError = console.error;
  console.error = () => {};
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe("WorkflowRuntime", () => {
  let mockWorkflow: Workflow;
  let mockOptions: Required<WorkflowExecutionOptions>;
  let mockCreateExecutableNode: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    (validateWorkflow as any).mockReset();
    (validateWorkflow as any).mockReturnValue([]);

    mockCreateExecutableNode = vi.fn((node) => {
      if (node.type === "unknown-type") {
        return undefined;
      }
      if (node.type === "failing") {
        return new FailingMockExecutableNode(node);
      }
      if (node.type === "start") {
        return new StartNode(node);
      }
      if (node.type === "process") {
        return new ProcessNode(node);
      }
      return new MockExecutableNode(node);
    });

    (NodeRegistry.getInstance as any).mockReturnValue({
      registerImplementation: vi.fn(),
      getImplementation: vi.fn(),
      createExecutableNode: mockCreateExecutableNode,
    });

    mockWorkflow = {
      id: "test-workflow",
      name: "Test Workflow",
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
          name: "Process Node",
          type: "process",
          position: { x: 300, y: 100 },
          inputs: [{ name: "input1", type: "string" }],
          outputs: [{ name: "output1", type: "string" }],
        },
        {
          id: "node-3",
          name: "End Node",
          type: "process",
          position: { x: 500, y: 100 },
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
        {
          source: "node-2",
          target: "node-3",
          sourceOutput: "output1",
          targetInput: "input1",
        },
      ],
    };

    mockOptions = {
      onNodeStart: vi.fn(),
      onNodeComplete: vi.fn(),
      onNodeError: vi.fn(),
      onExecutionComplete: vi.fn(),
      onExecutionError: vi.fn(),
      abortSignal: new AbortController().signal,
    };
  });

  it("should initialize with a workflow and options", () => {
    const runtime = new WorkflowRuntime(mockWorkflow, mockOptions);
    expect(runtime).toBeInstanceOf(WorkflowRuntime);
  });

  it("should validate the workflow before execution", async () => {
    const runtime = new WorkflowRuntime(mockWorkflow, mockOptions);
    await runtime.execute();
    expect(validateWorkflow).toHaveBeenCalledWith(mockWorkflow);
  });

  it("should execute nodes in the correct order", async () => {
    const runtime = new WorkflowRuntime(mockWorkflow, mockOptions);
    await runtime.execute();

    expect(mockOptions.onNodeStart).toHaveBeenCalledTimes(3);
    expect(mockOptions.onNodeComplete).toHaveBeenCalledTimes(3);

    expect(mockOptions.onNodeStart).toHaveBeenNthCalledWith(1, "node-1");
    expect(mockOptions.onNodeStart).toHaveBeenNthCalledWith(2, "node-2");
    expect(mockOptions.onNodeStart).toHaveBeenNthCalledWith(3, "node-3");

    const nodeCompleteCalls = (
      mockOptions.onNodeComplete as ReturnType<typeof vi.fn>
    ).mock.calls;
    expect(nodeCompleteCalls[0][0]).toBe("node-1");
    expect(nodeCompleteCalls[1][0]).toBe("node-2");
    expect(nodeCompleteCalls[2][0]).toBe("node-3");
  });

  it("should handle unregistered node types", async () => {
    const workflowWithUnknownNode: Workflow = {
      ...mockWorkflow,
      nodes: [
        {
          id: "unknown-node",
          name: "Unknown Node",
          type: "unknown-type",
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [],
        },
      ],
      edges: [],
    };

    const runtime = new WorkflowRuntime(workflowWithUnknownNode, mockOptions);
    await expect(runtime.execute()).rejects.toThrow(
      "Workflow validation failed: Node type 'unknown-type' is not registered"
    );
    expect(mockOptions.onExecutionError).toHaveBeenCalledWith(
      "Workflow validation failed: Node type 'unknown-type' is not registered"
    );
  });

  it("should handle node execution errors", async () => {
    const workflowWithFailingNode: Workflow = {
      ...mockWorkflow,
      nodes: [
        {
          id: "failing-node",
          name: "Failing Node",
          type: "failing",
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [],
        },
      ],
      edges: [],
    };

    const runtime = new WorkflowRuntime(workflowWithFailingNode, mockOptions);
    await runtime.execute();

    expect(mockOptions.onNodeError).toHaveBeenCalledWith(
      "failing-node",
      "Error executing node failing-node"
    );
  });

  it("should handle workflow validation errors", async () => {
    const validationError = {
      type: "VALIDATION_ERROR",
      message: "Test validation error",
      details: {},
    };

    (validateWorkflow as any).mockReturnValueOnce([validationError]);

    const runtime = new WorkflowRuntime(mockWorkflow, mockOptions);
    await expect(runtime.execute()).rejects.toThrow(
      "Workflow validation failed"
    );
    expect(mockOptions.onExecutionError).toHaveBeenCalled();
  });

  it("should handle abort signal", async () => {
    const abortController = new AbortController();
    const options = {
      ...mockOptions,
      abortSignal: abortController.signal,
    };

    const runtime = new WorkflowRuntime(mockWorkflow, options);
    const executePromise = runtime.execute();

    // Abort the execution
    abortController.abort();

    const result = await executePromise;
    expect(result).toBeInstanceOf(Map);

    const state = runtime.getExecutionState();
    expect(state.aborted).toBe(true);
  });

  it("should properly handle node inputs and outputs", async () => {
    const runtime = new WorkflowRuntime(mockWorkflow, mockOptions);
    await runtime.execute();

    const state = runtime.getExecutionState();
    expect(state.outputs).toBeInstanceOf(Map);
    expect(state.executedNodes).toContain("node-1");
    expect(state.executedNodes).toContain("node-2");
    expect(state.executedNodes).toContain("node-3");
  });
});
