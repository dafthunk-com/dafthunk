import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from "vitest";
import {
  ExecutableNode,
  NodeContext,
  NodeRegistry,
  WorkflowExecutionOptions,
  WorkflowRuntime,
} from "./workflowRuntime";
import {
  Workflow,
  Node,
  ExecutionResult,
} from "./workflowModel";
import { validateWorkflow } from "./workflowValidation";

// Mock the validateWorkflow function
vi.mock("./workflowValidation", () => ({
  validateWorkflow: vi.fn().mockReturnValue([]),
}));

// Mock the registerBaseNodes function
vi.mock("./nodes/baseNodes", () => ({
  registerBaseNodes: vi.fn(),
}));

// Mock the NodeRegistry - this needs to be before any variable declarations that use it
vi.mock("./workflowTypes", async () => {
  const originalModule = (await vi.importActual("./workflowTypes")) as object;
  return {
    ...originalModule,
    NodeRegistry: {
      getInstance: vi.fn().mockReturnValue({
        registerImplementation: vi.fn(),
        getImplementation: vi.fn(),
        createExecutableNode: vi.fn(),
      }),
    },
  };
});

// Create a mock node implementation for testing
class MockExecutableNode implements ExecutableNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  position: { x: number; y: number };
  inputValues: { name: string; type: string; description?: string; value?: any }[];
  outputValues: { name: string; type: string; description?: string; value?: any }[];
  error?: string;
  executeMock: ReturnType<typeof vi.fn>;

  constructor(node: Node) {
    this.id = node.id;
    this.name = node.name;
    this.type = node.type;
    this.description = node.description;
    this.position = node.position;
    this.inputValues = node.inputValues;
    this.outputValues = node.outputValues;
    this.error = node.error;
    this.executeMock = vi.fn().mockResolvedValue({
      nodeId: this.id,
      success: true,
      outputs: { result: `Output from ${this.id}` },
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
      nodeId: this.id,
      success: false,
      error: `Error executing node ${this.id}`,
    });
  }
}

// Add these hooks at the top level, before the first describe block
let originalConsoleError: typeof console.error;

beforeAll(() => {
  // Store the original console.error
  originalConsoleError = console.error;
  // Replace console.error with a no-op function
  console.error = () => {};
});

afterAll(() => {
  // Restore the original console.error
  console.error = originalConsoleError;
});

describe("WorkflowRuntime", () => {
  let mockWorkflow: Workflow;
  let mockOptions: Required<WorkflowExecutionOptions>;
  let mockCreateExecutableNode: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Reset validateWorkflow mock to return empty array by default
    (validateWorkflow as any).mockReset();
    (validateWorkflow as any).mockReturnValue([]);

    // Get the mocked createExecutableNode function
    mockCreateExecutableNode = vi.fn((node) => {
      // For the "should handle unregistered node types" test
      if (node.type === "unknown-type") {
        return undefined;
      }

      // For the "should handle node execution errors" test
      if (node.type === "failing") {
        return new FailingMockExecutableNode(node);
      }

      // For all other tests, return a mock executable node
      return new MockExecutableNode(node);
    });

    (NodeRegistry.getInstance as any).mockReturnValue({
      registerImplementation: vi.fn(),
      getImplementation: vi.fn(),
      createExecutableNode: mockCreateExecutableNode,
    });

    // Create a simple workflow for testing
    mockWorkflow = {
      id: "test-workflow",
      name: "Test Workflow",
      nodes: [
        {
          id: "node-1",
          name: "Start Node",
          type: "start",
          position: { x: 100, y: 100 },
          inputValues: [],
          outputValues: [{ name: "output1", type: "string", value: "Hello" }],
        },
        {
          id: "node-2",
          name: "Process Node",
          type: "process",
          position: { x: 300, y: 100 },
          inputValues: [{ name: "input1", type: "string" }],
          outputValues: [{ name: "output1", type: "string" }],
        },
        {
          id: "node-3",
          name: "End Node",
          type: "end",
          position: { x: 500, y: 100 },
          inputValues: [{ name: "input1", type: "string" }],
          outputValues: [],
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

    // Create mock options
    mockOptions = {
      onNodeStart: vi.fn(),
      onNodeComplete: vi.fn(),
      onNodeError: vi.fn(),
      onExecutionComplete: vi.fn(),
      onExecutionError: vi.fn(),
    };
  });

  it("should initialize with a workflow and options", () => {
    const runtime = new WorkflowRuntime(mockWorkflow, mockOptions);
    expect(runtime).toBeInstanceOf(WorkflowRuntime);
  });

  it("should validate the workflow before execution", async () => {
    const runtime = new WorkflowRuntime(mockWorkflow, mockOptions);

    // Mock the validate method to return no errors
    vi.spyOn(runtime, "validate").mockResolvedValue([]);

    await runtime.execute();

    expect(runtime.validate).toHaveBeenCalled();
  });

  it("should execute nodes in the correct order", async () => {
    // Mock validateWorkflow to return empty array for this test
    (validateWorkflow as any).mockReturnValueOnce([]);

    const runtime = new WorkflowRuntime(mockWorkflow, mockOptions);

    // Mock the validate method to return no errors
    vi.spyOn(runtime, "validate").mockResolvedValue([]);

    // Mock the executableNodes map to include all nodes
    (runtime as any).executableNodes = new Map();
    mockWorkflow.nodes.forEach((node) => {
      const executableNode = mockCreateExecutableNode(node);
      if (executableNode) {
        (runtime as any).executableNodes.set(node.id, executableNode);
      }
    });

    await runtime.execute();

    // Check that nodes were executed in the correct order
    expect(mockOptions.onNodeStart).toHaveBeenCalledTimes(3);
    expect(mockOptions.onNodeComplete).toHaveBeenCalledTimes(3);

    // Check execution order for onNodeStart
    expect(mockOptions.onNodeStart).toHaveBeenNthCalledWith(1, "node-1");
    expect(mockOptions.onNodeStart).toHaveBeenNthCalledWith(2, "node-2");
    expect(mockOptions.onNodeStart).toHaveBeenNthCalledWith(3, "node-3");

    // For onNodeComplete, we can't check the exact parameters due to the mock implementation
    // Just verify that it was called for each node in the correct order
    const nodeCompleteCalls = (
      mockOptions.onNodeComplete as ReturnType<typeof vi.fn>
    ).mock.calls;
    expect(nodeCompleteCalls[0][0]).toBe("node-1");
    expect(nodeCompleteCalls[1][0]).toBe("node-2");
    expect(nodeCompleteCalls[2][0]).toBe("node-3");
  });

  it("should pass data between nodes correctly", async () => {
    // Mock validateWorkflow to return empty array for this test
    (validateWorkflow as any).mockReturnValueOnce([]);

    // Setup mock node execution to pass data
    mockCreateExecutableNode.mockImplementation((node) => {
      const mockNode = new MockExecutableNode(node);

      if (node.id === "node-1") {
        mockNode.executeMock.mockResolvedValue({
          nodeId: node.id,
          success: true,
          outputs: { output1: "Hello from node-1" },
        });
      } else if (node.id === "node-2") {
        mockNode.executeMock.mockImplementation(async (context) => {
          // Check that we received the correct input from node-1
          expect(context.inputs.input1).toBe("Hello from node-1");

          return {
            nodeId: node.id,
            success: true,
            outputs: { output1: `Processed: ${context.inputs.input1}` },
          };
        });
      }

      return mockNode;
    });

    const runtime = new WorkflowRuntime(mockWorkflow, mockOptions);

    // Mock the validate method to return no errors
    vi.spyOn(runtime, "validate").mockResolvedValue([]);

    // Mock the executableNodes map to include all nodes
    (runtime as any).executableNodes = new Map();
    mockWorkflow.nodes.forEach((node) => {
      const executableNode = mockCreateExecutableNode(node);
      if (executableNode) {
        (runtime as any).executableNodes.set(node.id, executableNode);
      }
    });

    await runtime.execute();

    // Check that data was passed correctly
    const state = runtime.getExecutionState();
    expect(state.outputs.get("node-1")).toEqual({
      output1: "Hello from node-1",
    });
    expect(state.outputs.get("node-2")).toEqual({
      output1: "Processed: Hello from node-1",
    });
  });

  it("should handle node execution errors", async () => {
    // Mock validateWorkflow to return empty array for this test
    (validateWorkflow as any).mockReturnValueOnce([]);

    // Create a workflow with a failing node
    const errorWorkflow: Workflow = {
      ...mockWorkflow,
      nodes: [
        {
          id: "node-1",
          name: "Start Node",
          type: "start",
          position: { x: 100, y: 100 },
          inputValues: [],
          outputValues: [{ name: "output1", type: "string", value: "Hello" }],
        },
        {
          id: "node-2",
          name: "Failing Node",
          type: "failing", // This will create a FailingMockExecutableNode
          position: { x: 300, y: 100 },
          inputValues: [{ name: "input1", type: "string" }],
          outputValues: [{ name: "output1", type: "string" }],
        },
        {
          id: "node-3",
          name: "Process Node",
          type: "process",
          position: { x: 500, y: 100 },
          inputValues: [{ name: "input1", type: "string" }],
          outputValues: [{ name: "output1", type: "string" }],
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

    const runtime = new WorkflowRuntime(errorWorkflow, mockOptions);

    // Mock the validate method to return no errors
    vi.spyOn(runtime, "validate").mockResolvedValue([]);

    // Mock the executableNodes map to include all nodes
    (runtime as any).executableNodes = new Map();
    errorWorkflow.nodes.forEach((node) => {
      const executableNode = mockCreateExecutableNode(node);
      if (executableNode) {
        (runtime as any).executableNodes.set(node.id, executableNode);
      }
    });

    // Execute should not throw, but should call onExecutionError
    try {
      await runtime.execute();
    } catch (error) {
      // Expected error, we'll check the callbacks below
    }

    // Check that error was handled
    expect(mockOptions.onNodeError).toHaveBeenCalledWith(
      "node-2",
      "Error executing node node-2"
    );
    expect(mockOptions.onExecutionError).toHaveBeenCalledWith(
      "Some nodes could not be executed: node-3"
    );

    // Check that node-3 was not executed because node-2 failed
    expect(mockOptions.onNodeStart).not.toHaveBeenCalledWith("node-3");
  });

  it("should handle workflows with no start nodes", async () => {
    // Create a workflow with no start nodes (all nodes have incoming edges)
    const noStartNodesWorkflow: Workflow = {
      ...mockWorkflow,
      edges: [
        ...mockWorkflow.edges,
        {
          source: "node-3",
          target: "node-1",
          sourceOutput: "output1",
          targetInput: "input1",
        },
      ],
    };

    // Mock validateWorkflow to return empty array so we can test the "No start nodes found" error
    (validateWorkflow as any).mockReturnValueOnce([]);

    const runtime = new WorkflowRuntime(noStartNodesWorkflow, mockOptions);

    // Mock the validate method to return no errors
    vi.spyOn(runtime, "validate").mockResolvedValue([]);

    // Mock the executableNodes map to include all nodes
    (runtime as any).executableNodes = new Map();
    noStartNodesWorkflow.nodes.forEach((node) => {
      const executableNode = mockCreateExecutableNode(node);
      if (executableNode) {
        (runtime as any).executableNodes.set(node.id, executableNode);
      }
    });

    await expect(runtime.execute()).rejects.toThrow(
      "No start nodes found in workflow"
    );
    expect(mockOptions.onExecutionError).toHaveBeenCalledWith(
      "No start nodes found in workflow"
    );
  });

  it("should handle unregistered node types", async () => {
    // Create a workflow with an unregistered node type
    const unregisteredNodeWorkflow: Workflow = {
      ...mockWorkflow,
      nodes: [
        ...mockWorkflow.nodes,
        {
          id: "node-4",
          name: "Unknown Node",
          type: "unknown-type",
          position: { x: 700, y: 100 },
          inputValues: [{ name: "input1", type: "string" }],
          outputValues: [{ name: "output1", type: "string" }],
        },
      ],
      edges: [
        ...mockWorkflow.edges,
        {
          source: "node-3",
          target: "node-4",
          sourceOutput: "output1",
          targetInput: "input1",
        },
      ],
    };

    const runtime = new WorkflowRuntime(unregisteredNodeWorkflow, mockOptions);

    // Check that validation detects the unregistered node type
    const errors = await runtime.validate();
    expect(errors.some((e) => e.message.includes("unknown-type"))).toBe(true);
  });

  it("should return execution state with outputs and errors", async () => {
    // Create a workflow with a failing node
    const errorWorkflow: Workflow = {
      ...mockWorkflow,
      nodes: [
        {
          id: "node-1",
          name: "Start Node",
          type: "start",
          position: { x: 100, y: 100 },
          inputValues: [],
          outputValues: [{ name: "output1", type: "string", value: "Hello" }],
        },
        {
          id: "node-2",
          name: "Failing Node",
          type: "failing",
          position: { x: 300, y: 100 },
          inputValues: [{ name: "input1", type: "string" }],
          outputValues: [{ name: "output1", type: "string" }],
        },
        {
          id: "node-3",
          name: "Process Node",
          type: "process",
          position: { x: 500, y: 100 },
          inputValues: [{ name: "input1", type: "string" }],
          outputValues: [{ name: "output1", type: "string" }],
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

    const runtime = new WorkflowRuntime(errorWorkflow, mockOptions);

    // Mock the validate method to return no errors
    vi.spyOn(runtime, "validate").mockResolvedValue([]);

    // Mock the executableNodes map to include all nodes
    (runtime as any).executableNodes = new Map();
    errorWorkflow.nodes.forEach((node) => {
      const executableNode = mockCreateExecutableNode(node);
      if (executableNode) {
        (runtime as any).executableNodes.set(node.id, executableNode);
      }
    });

    // Update the mock for node-1 to return the expected output
    const node1 = (runtime as any).executableNodes.get("node-1");
    if (node1) {
      node1.executeMock.mockResolvedValue({
        nodeId: "node-1",
        success: true,
        outputs: { output1: "Hello" },
      });
    }

    try {
      await runtime.execute();
    } catch (error) {
      // Ignore execution errors
    }

    const state = runtime.getExecutionState();

    expect(state.executedNodes).toContain("node-1");
    expect(state.executedNodes).not.toContain("node-3");
    expect(state.errorNodes.get("node-2")).toBe("Error executing node node-2");
    expect(state.outputs.get("node-1")).toEqual({ output1: "Hello" });
  });

  it("should handle complex workflows with multiple start nodes", async () => {
    // Mock validateWorkflow to return empty array for this test
    (validateWorkflow as any).mockReturnValueOnce([]);

    // Create a more complex workflow with multiple start nodes
    const complexWorkflow: Workflow = {
      id: "complex-workflow",
      name: "Complex Workflow",
      nodes: [
        {
          id: "start-1",
          name: "Start Node 1",
          type: "start",
          position: { x: 100, y: 100 },
          inputValues: [],
          outputValues: [
            { name: "output1", type: "string", value: "Hello from start-1" },
          ],
        },
        {
          id: "start-2",
          name: "Start Node 2",
          type: "start",
          position: { x: 100, y: 300 },
          inputValues: [],
          outputValues: [
            { name: "output1", type: "string", value: "Hello from start-2" },
          ],
        },
        {
          id: "process-1",
          name: "Process Node 1",
          type: "process",
          position: { x: 300, y: 100 },
          inputValues: [{ name: "input1", type: "string" }],
          outputValues: [{ name: "output1", type: "string" }],
        },
        {
          id: "process-2",
          name: "Process Node 2",
          type: "process",
          position: { x: 300, y: 300 },
          inputValues: [{ name: "input1", type: "string" }],
          outputValues: [{ name: "output1", type: "string" }],
        },
        {
          id: "end",
          name: "End Node",
          type: "end",
          position: { x: 500, y: 200 },
          inputValues: [
            { name: "input1", type: "string" },
            { name: "input2", type: "string" },
          ],
          outputValues: [],
        },
      ],
      edges: [
        {
          source: "start-1",
          target: "process-1",
          sourceOutput: "output1",
          targetInput: "input1",
        },
        {
          source: "start-2",
          target: "process-2",
          sourceOutput: "output1",
          targetInput: "input1",
        },
        {
          source: "process-1",
          target: "end",
          sourceOutput: "output1",
          targetInput: "input1",
        },
        {
          source: "process-2",
          target: "end",
          sourceOutput: "output1",
          targetInput: "input2",
        },
      ],
    };

    // Setup mock node execution for the complex workflow
    mockCreateExecutableNode.mockImplementation((node) => {
      const mockNode = new MockExecutableNode(node);

      if (node.id === "process-1" || node.id === "process-2") {
        mockNode.executeMock.mockImplementation(async (context) => {
          return {
            nodeId: node.id,
            success: true,
            outputs: {
              output1: `Processed by ${node.id}: ${context.inputs.input1}`,
            },
          };
        });
      }

      return mockNode;
    });

    const runtime = new WorkflowRuntime(complexWorkflow, mockOptions);

    // Mock the validate method to return no errors
    vi.spyOn(runtime, "validate").mockResolvedValue([]);

    // Mock the executableNodes map to include all nodes
    (runtime as any).executableNodes = new Map();
    complexWorkflow.nodes.forEach((node) => {
      const executableNode = mockCreateExecutableNode(node);
      if (executableNode) {
        (runtime as any).executableNodes.set(node.id, executableNode);
      }
    });

    await runtime.execute();

    // Check that all nodes were executed
    expect(mockOptions.onNodeStart).toHaveBeenCalledWith("start-1");
    expect(mockOptions.onNodeStart).toHaveBeenCalledWith("start-2");
    expect(mockOptions.onNodeStart).toHaveBeenCalledWith("process-1");
    expect(mockOptions.onNodeStart).toHaveBeenCalledWith("process-2");
    expect(mockOptions.onNodeStart).toHaveBeenCalledWith("end");
  });
});
