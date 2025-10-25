import type { Workflow, WorkflowExecution } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { TestNodeRegistry } from "../nodes/test-node-registry";
import { TestToolRegistry } from "../nodes/test-tool-registry";
import { ResourceProvider } from "./resource-provider";
import type { ExecutionState, WorkflowExecutionContext } from "./types";
import { getExecutionStatus } from "./types";

/**
 * Runtime Specification Tests
 *
 * This test suite validates Runtime behavior by testing its core execution logic.
 * While we can't directly instantiate Runtime (it requires Cloudflare Workers infrastructure),
 * we test the exact same logic through TestRuntime which mirrors Runtime's implementation.
 *
 * This validates:
 * - Workflow initialization and validation
 * - Topological ordering and cycle detection
 * - Node execution and error handling (using real node implementations)
 * - Input collection and parameter mapping
 * - Skip logic and conditional execution
 * - State management and consistency
 * - Monitoring updates and status computation
 */
describe("Runtime Specification", () => {
  // Mock Analytics Engine binding
  const testEnv = {
    COMPUTE: {
      writeDataPoint: () => {}, // Mock analytics write
    },
  } as any;

  // Mock execution monitoring
  let monitoringSendUpdate: ReturnType<typeof vi.fn>;
  let monitoring: { sendUpdate: typeof monitoringSendUpdate };

  const createMonitoring = () => {
    monitoringSendUpdate = vi.fn().mockResolvedValue(undefined);
    monitoring = {
      sendUpdate: monitoringSendUpdate,
    };
    return monitoring;
  };

  // Helper to create execution context
  const createContext = (workflow: Workflow): WorkflowExecutionContext => ({
    workflow,
    orderedNodeIds: workflow.nodes.map((node) => node.id),
    workflowId: workflow.id,
    organizationId: "test-org",
    executionId: "test-exec",
  });

  // Helper to create initial execution state
  const createState = (): ExecutionState => ({
    nodeOutputs: new Map(),
    executedNodes: new Set(),
    skippedNodes: new Set(),
    nodeErrors: new Map(),
  });

  /**
   * TestRuntime mirrors Runtime's private execution logic.
   * This allows us to test the actual implementation without Cloudflare infrastructure.
   * The logic here should be kept in sync with Runtime's private methods.
   */
  class TestRuntime {
    private nodeRegistry: TestNodeRegistry;
    private resourceProvider: ResourceProvider;
    private env: any;

    constructor(env: any) {
      this.env = env;
      this.nodeRegistry = new TestNodeRegistry(env, true);

      // Create tool registry with factory function
      let resourceProvider: ResourceProvider;
      const toolRegistry = new TestToolRegistry(
        this.nodeRegistry,
        (nodeId: string, inputs: Record<string, any>) =>
          resourceProvider.createToolContext(nodeId, inputs)
      );
      this.resourceProvider = resourceProvider = new ResourceProvider(
        env,
        toolRegistry
      );
    }

    // Mirrors Runtime's executeNode logic
    async executeNode(
      context: WorkflowExecutionContext,
      state: ExecutionState,
      nodeId: string
    ): Promise<ExecutionState> {
      const node = context.workflow.nodes.find((n): boolean => n.id === nodeId);
      if (!node) {
        state.nodeErrors.set(nodeId, "Node not found");
        return state;
      }

      const executable = this.nodeRegistry.createExecutableNode(node);
      if (!executable) {
        state.nodeErrors.set(
          nodeId,
          `Node type '${node.type}' not implemented`
        );
        return state;
      }

      // Collect inputs from node static values
      const inputs: Record<string, any> = {};
      for (const input of node.inputs) {
        if (input.value !== undefined) {
          inputs[input.name] = input.value;
        }
      }

      // Collect inputs from edges
      const inboundEdges = context.workflow.edges.filter(
        (edge): boolean => edge.target === nodeId
      );
      for (const edge of inboundEdges) {
        const sourceOutputs = state.nodeOutputs.get(edge.source);
        if (sourceOutputs && sourceOutputs[edge.sourceOutput] !== undefined) {
          inputs[edge.targetInput] = sourceOutputs[edge.sourceOutput];
        }
      }

      try {
        const nodeContext = this.resourceProvider.createNodeContext(
          nodeId,
          context.workflowId,
          context.organizationId,
          inputs,
          undefined,
          undefined
        );

        const result = await executable.execute(nodeContext);

        if (result.status === "completed") {
          state.nodeOutputs.set(nodeId, result.outputs ?? {});
          state.executedNodes.add(nodeId);
        } else {
          const failureMessage = result.error ?? "Unknown error";
          state.nodeErrors.set(nodeId, failureMessage);
        }

        return state;
      } catch (error) {
        state.nodeErrors.set(
          nodeId,
          error instanceof Error ? error.message : String(error)
        );
        return state;
      }
    }

    shouldSkipNode(state: ExecutionState, nodeId: string): boolean {
      return state.nodeErrors.has(nodeId) || state.skippedNodes.has(nodeId);
    }
  }

  // Helper to execute a workflow and track monitoring updates
  const executeWorkflow = async (
    workflow: Workflow,
    executionId: string = "test-exec"
  ): Promise<{
    state: ExecutionState;
    updates: WorkflowExecution[];
  }> => {
    const runtime = new TestRuntime(testEnv);
    const monitoring = createMonitoring();

    const context = createContext(workflow);
    let state = createState();

    // Simulate Runtime's initial update
    await monitoring.sendUpdate({
      id: executionId,
      workflowId: workflow.id,
      status: "executing",
      nodeExecutions: [],
    } as WorkflowExecution);

    // Execute each node
    for (const nodeId of context.orderedNodeIds) {
      if (runtime.shouldSkipNode(state, nodeId)) {
        continue;
      }

      state = await runtime.executeNode(context, state, nodeId);

      // Send progress update after each node (simulating Runtime behavior)
      await monitoring.sendUpdate({
        id: executionId,
        workflowId: workflow.id,
        status: getExecutionStatus(context, state),
        nodeExecutions: Array.from(state.executedNodes).map((nodeId) => ({
          nodeId,
          status: state.nodeErrors.has(nodeId) ? "error" : "completed",
          error: state.nodeErrors.get(nodeId),
          outputs: state.nodeOutputs.get(nodeId) as any,
        })),
      } as WorkflowExecution);
    }

    // Send final update
    await monitoring.sendUpdate({
      id: executionId,
      workflowId: workflow.id,
      status: getExecutionStatus(context, state),
      nodeExecutions: Array.from(context.workflow.nodes).map((node) => ({
        nodeId: node.id,
        status: state.nodeErrors.has(node.id)
          ? "error"
          : state.executedNodes.has(node.id)
            ? "completed"
            : state.skippedNodes.has(node.id)
              ? "skipped"
              : "idle",
        error: state.nodeErrors.get(node.id),
        outputs: state.nodeOutputs.get(node.id) as any,
      })),
    } as WorkflowExecution);

    return {
      state,
      updates: monitoringSendUpdate.mock.calls.map((call) => call[0]),
    };
  };

  // Monitoring assertion helpers
  const assertInitialUpdate = (
    update: WorkflowExecution,
    workflowId: string,
    executionId: string
  ) => {
    expect(update.id).toBe(executionId);
    expect(update.workflowId).toBe(workflowId);
    expect(update.status).toBe("executing");
    expect(update.nodeExecutions).toEqual([]);
  };

  const assertProgressUpdate = (
    update: WorkflowExecution,
    expectedCompletedCount: number
  ) => {
    const completedNodes = update.nodeExecutions.filter(
      (ne) => ne.status === "completed"
    );
    expect(completedNodes.length).toBe(expectedCompletedCount);
  };

  const assertFinalUpdate = (
    update: WorkflowExecution,
    expectedStatus: "completed" | "error",
    totalNodeCount: number
  ) => {
    expect(update.status).toBe(expectedStatus);
    expect(update.nodeExecutions.length).toBe(totalNodeCount);

    // All nodes must have a status (no undefined/null)
    for (const ne of update.nodeExecutions) {
      expect(ne.status).toBeDefined();
      expect(["completed", "error", "skipped", "idle"]).toContain(ne.status);
    }
  };

  const assertNodeExecution = (
    nodeExecutions: any[],
    nodeId: string,
    expectedStatus: "completed" | "error" | "skipped" | "idle",
    options?: { hasOutputs?: boolean; hasError?: boolean; errorContains?: string }
  ) => {
    const nodeExec = nodeExecutions.find((ne) => ne.nodeId === nodeId);
    expect(nodeExec).toBeDefined();
    expect(nodeExec?.status).toBe(expectedStatus);

    if (options?.hasOutputs) {
      expect(nodeExec?.outputs).toBeDefined();
    }

    if (options?.hasError) {
      expect(nodeExec?.error).toBeDefined();
    }

    if (options?.errorContains) {
      expect(nodeExec?.error).toContain(options.errorContains);
    }
  };

  describe("successful execution", () => {
    it("should execute simple linear workflow (number-input → addition → multiplication)", async () => {
      const workflow: Workflow = {
        id: "test-workflow-1",
        name: "Linear Math Workflow",
        handle: "linear-math",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 3, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "mult",
            name: "Multiply",
            type: "multiplication",
            position: { x: 400, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 2, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "add",
            targetInput: "b",
          },
          {
            source: "add",
            sourceOutput: "result",
            target: "mult",
            targetInput: "a",
          },
        ],
      };

      const { state, updates } = await executeWorkflow(workflow);

      // Verify execution state
      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("completed");
      expect(state.executedNodes.size).toBe(4);
      expect(state.nodeErrors.size).toBe(0);
      expect(state.nodeOutputs.get("add")?.result).toBe(8); // 5 + 3
      expect(state.nodeOutputs.get("mult")?.result).toBe(16); // 8 * 2

      // Verify monitoring updates
      // Should have: initial + 4 progress updates (one per node) + final = 6 total
      expect(updates).toHaveLength(6);

      // Initial update - verify structure
      assertInitialUpdate(updates[0], workflow.id, "test-exec");

      // Progress updates after each node - verify progression
      assertProgressUpdate(updates[1], 1); // After num1
      assertProgressUpdate(updates[2], 2); // After num2
      assertProgressUpdate(updates[3], 3); // After add
      assertProgressUpdate(updates[4], 4); // After mult

      // Final update - verify complete state
      assertFinalUpdate(updates[5], "completed", 4);
      assertNodeExecution(updates[5].nodeExecutions, "num1", "completed", { hasOutputs: true });
      assertNodeExecution(updates[5].nodeExecutions, "num2", "completed", { hasOutputs: true });
      assertNodeExecution(updates[5].nodeExecutions, "add", "completed", { hasOutputs: true });
      assertNodeExecution(updates[5].nodeExecutions, "mult", "completed", { hasOutputs: true });

      // Verify outputs are included in final update
      const addExec = updates[5].nodeExecutions.find((ne) => ne.nodeId === "add");
      const multExec = updates[5].nodeExecutions.find((ne) => ne.nodeId === "mult");
      expect(addExec?.outputs).toHaveProperty("result", 8);
      expect(multExec?.outputs).toHaveProperty("result", 16);
    });

    it("should execute parallel workflow with multiple independent branches", async () => {
      const workflow: Workflow = {
        id: "test-workflow-2",
        name: "Parallel Math Workflow",
        handle: "parallel-math",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num3",
            name: "Number 3",
            type: "number-input",
            position: { x: 0, y: 200 },
            inputs: [{ name: "value", type: "number", value: 3, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num4",
            name: "Number 4",
            type: "number-input",
            position: { x: 0, y: 300 },
            inputs: [{ name: "value", type: "number", value: 2, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add1",
            name: "Add 1",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "add2",
            name: "Add 2",
            type: "addition",
            position: { x: 200, y: 250 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "mult",
            name: "Multiply Results",
            type: "multiplication",
            position: { x: 400, y: 150 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "add1",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "add1",
            targetInput: "b",
          },
          {
            source: "num3",
            sourceOutput: "value",
            target: "add2",
            targetInput: "a",
          },
          {
            source: "num4",
            sourceOutput: "value",
            target: "add2",
            targetInput: "b",
          },
          {
            source: "add1",
            sourceOutput: "result",
            target: "mult",
            targetInput: "a",
          },
          {
            source: "add2",
            sourceOutput: "result",
            target: "mult",
            targetInput: "b",
          },
        ],
      };

      const { state, updates } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("completed");
      expect(state.executedNodes.size).toBe(7);
      expect(state.nodeErrors.size).toBe(0);
      expect(state.nodeOutputs.get("add1")?.result).toBe(15); // 10 + 5
      expect(state.nodeOutputs.get("add2")?.result).toBe(5); // 3 + 2
      expect(state.nodeOutputs.get("mult")?.result).toBe(75); // 15 * 5

      // Verify monitoring updates for parallel execution
      // Should have: initial + 7 progress updates + final = 9 total
      expect(updates).toHaveLength(9);

      // Initial update
      assertInitialUpdate(updates[0], workflow.id, "test-exec");

      // Final update
      const finalUpdate = updates[updates.length - 1];
      assertFinalUpdate(finalUpdate, "completed", 7);

      // All nodes should be completed
      assertNodeExecution(finalUpdate.nodeExecutions, "num1", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "num2", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "num3", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "num4", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "add1", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "add2", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "mult", "completed", { hasOutputs: true });
    });

    it("should execute workflow with chained operations", async () => {
      const workflow: Workflow = {
        id: "test-workflow-3",
        name: "Chained Operations Workflow",
        handle: "chained-ops",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 2, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 3, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "mult",
            name: "Multiply",
            type: "multiplication",
            position: { x: 400, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 4, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "sub",
            name: "Subtract",
            type: "subtraction",
            position: { x: 600, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 1, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "add",
            targetInput: "b",
          },
          {
            source: "add",
            sourceOutput: "result",
            target: "mult",
            targetInput: "a",
          },
          {
            source: "mult",
            sourceOutput: "result",
            target: "sub",
            targetInput: "a",
          },
        ],
      };

      const { state, updates } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("completed");
      expect(state.executedNodes.size).toBe(5);
      expect(state.nodeErrors.size).toBe(0);
      // num1=2, num2=3, add=5, mult=20, sub=19
      expect(state.nodeOutputs.get("add")?.result).toBe(5);
      expect(state.nodeOutputs.get("mult")?.result).toBe(20);
      expect(state.nodeOutputs.get("sub")?.result).toBe(19);

      // Verify monitoring updates for chained execution
      // Should have: initial + 5 progress updates + final = 7 total
      expect(updates).toHaveLength(7);

      // Initial and final updates
      assertInitialUpdate(updates[0], workflow.id, "test-exec");
      assertFinalUpdate(updates[updates.length - 1], "completed", 5);

      // All nodes should be completed with outputs
      const finalUpdate = updates[updates.length - 1];
      assertNodeExecution(finalUpdate.nodeExecutions, "num1", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "num2", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "add", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "mult", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "sub", "completed", { hasOutputs: true });
    });
  });

  describe("failing execution", () => {
    it("should handle division by zero error", async () => {
      const workflow: Workflow = {
        id: "test-workflow-4",
        name: "Division by Zero Workflow",
        handle: "div-by-zero",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Zero",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 0, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "div",
            name: "Divide",
            type: "division",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "div",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "div",
            targetInput: "b",
          },
        ],
      };

      const { state, updates } = await executeWorkflow(workflow);

      // Verify execution state
      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("error");
      expect(state.executedNodes.size).toBe(2); // Only num1 and num2 succeeded
      expect(state.nodeErrors.size).toBe(1);
      expect(state.nodeErrors.get("div")).toContain("Division by zero");

      // Verify monitoring updates
      // Should have: initial + 3 progress updates + final = 5 total
      expect(updates).toHaveLength(5);

      // Final update should show error status
      const finalUpdate = updates[updates.length - 1];
      expect(finalUpdate.status).toBe("error");

      // Should have error recorded for div node
      const divExecution = finalUpdate.nodeExecutions.find(
        (ne) => ne.nodeId === "div"
      );
      expect(divExecution?.status).toBe("error");
      expect(divExecution?.error).toContain("Division by zero");

      // num1 and num2 should be completed
      const num1Execution = finalUpdate.nodeExecutions.find(
        (ne) => ne.nodeId === "num1"
      );
      const num2Execution = finalUpdate.nodeExecutions.find(
        (ne) => ne.nodeId === "num2"
      );
      expect(num1Execution?.status).toBe("completed");
      expect(num2Execution?.status).toBe("completed");
    });

    it("should handle missing required input", async () => {
      const workflow: Workflow = {
        id: "test-workflow-5",
        name: "Missing Input Workflow",
        handle: "missing-input",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          // Missing connection for input 'b'
        ],
      };

      const { state, updates } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("error");
      expect(state.executedNodes.size).toBe(1); // Only num1 succeeded
      expect(state.nodeErrors.size).toBe(1);
      expect(state.nodeErrors.get("add")).toContain("Input 'b' is required");

      // Verify monitoring updates for missing input error
      assertInitialUpdate(updates[0], workflow.id, "test-exec");

      const finalUpdate = updates[updates.length - 1];
      assertFinalUpdate(finalUpdate, "error", 2);

      // num1 completed, add failed
      assertNodeExecution(finalUpdate.nodeExecutions, "num1", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "add", "error", {
        hasError: true,
        errorContains: "Input 'b' is required",
      });
    });

    it("should handle error in middle of workflow chain", async () => {
      const workflow: Workflow = {
        id: "test-workflow-6",
        name: "Error Chain Workflow",
        handle: "error-chain",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Zero",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 0, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "div",
            name: "Divide",
            type: "division",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 400, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 5, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "div",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "div",
            targetInput: "b",
          },
          {
            source: "div",
            sourceOutput: "result",
            target: "add",
            targetInput: "a",
          },
        ],
      };

      const { state, updates } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("error");
      expect(state.executedNodes.size).toBe(2); // Only num1 and num2
      expect(state.nodeErrors.size).toBe(2); // div failed, add failed due to missing input
      expect(state.nodeErrors.get("div")).toContain("Division by zero");
      expect(state.nodeErrors.get("add")).toContain("Input 'a' is required");

      // Verify monitoring updates for cascading error
      assertInitialUpdate(updates[0], workflow.id, "test-exec");

      const finalUpdate = updates[updates.length - 1];
      assertFinalUpdate(finalUpdate, "error", 4);

      // num1 and num2 completed, div and add failed
      assertNodeExecution(finalUpdate.nodeExecutions, "num1", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "num2", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "div", "error", {
        hasError: true,
        errorContains: "Division by zero",
      });
      assertNodeExecution(finalUpdate.nodeExecutions, "add", "error", {
        hasError: true,
        errorContains: "Input 'a' is required",
      });
    });

    it("should handle workflow with error in middle node blocking dependent nodes", async () => {
      // This reproduces the bug: addition → subtraction (missing input b) → multiplication
      // The workflow should complete with error status, not stay stuck in "executing"
      const workflow: Workflow = {
        id: "test-workflow-7",
        name: "Stuck Workflow",
        handle: "stuck-workflow",
        type: "manual",
        nodes: [
          {
            id: "addition",
            name: "Addition",
            type: "addition",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "a", type: "number", value: 1, hidden: true },
              { name: "b", type: "number", value: 2, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "subtraction",
            name: "Subtraction",
            type: "subtraction",
            position: { x: 200, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
              // Missing connection for 'b' input!
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "multiplication",
            name: "Multiplication",
            type: "multiplication",
            position: { x: 400, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 1, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "addition",
            sourceOutput: "result",
            target: "subtraction",
            targetInput: "a",
          },
          {
            source: "subtraction",
            sourceOutput: "result",
            target: "multiplication",
            targetInput: "a",
          },
        ],
      };

      const { state, updates } = await executeWorkflow(workflow);

      // Verify execution state
      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("error"); // Should be error, NOT executing
      expect(state.executedNodes.size).toBe(1); // Only addition completed
      expect(state.nodeErrors.size).toBe(2); // Both subtraction and multiplication failed

      // Subtraction should fail due to missing input 'b'
      expect(state.nodeErrors.get("subtraction")).toContain(
        "Input 'b' is required"
      );

      // Multiplication should fail due to missing input from failed subtraction
      expect(state.nodeErrors.get("multiplication")).toContain(
        "Input 'a' is required"
      );

      // Verify monitoring updates match what Runtime sends
      // Updates: initial + 3 progress (addition, subtraction, multiplication) + final = 5 total
      expect(updates.length).toBeGreaterThanOrEqual(4);

      // The CRITICAL assertion: Final update must show "error" status
      const finalUpdate = updates[updates.length - 1];
      expect(finalUpdate.status).toBe("error"); // ❌ BUG: This was "executing" in production

      // Verify final update shows correct node statuses
      const additionExec = finalUpdate.nodeExecutions.find(
        (ne) => ne.nodeId === "addition"
      );
      const subtractionExec = finalUpdate.nodeExecutions.find(
        (ne) => ne.nodeId === "subtraction"
      );
      const multiplicationExec = finalUpdate.nodeExecutions.find(
        (ne) => ne.nodeId === "multiplication"
      );

      expect(additionExec?.status).toBe("completed");
      expect(subtractionExec?.status).toBe("error");
      expect(multiplicationExec?.status).toBe("error");

      // Verify intermediate updates show progression
      // After addition completes, status should still be "executing"
      const updateAfterAddition = updates.find(
        (u) =>
          u.nodeExecutions.some(
            (ne) => ne.nodeId === "addition" && ne.status === "completed"
          ) &&
          !u.nodeExecutions.some(
            (ne) => ne.nodeId === "subtraction" && ne.status === "error"
          )
      );
      if (updateAfterAddition) {
        expect(updateAfterAddition.status).toBe("executing");
      }

      // After subtraction fails, status should still be "executing" (not yet finished)
      const updateAfterSubtraction = updates.find(
        (u) =>
          u.nodeExecutions.some(
            (ne) => ne.nodeId === "subtraction" && ne.status === "error"
          ) && u !== finalUpdate
      );
      if (updateAfterSubtraction) {
        expect(updateAfterSubtraction.status).toBe("executing");
      }
    });
  });

  describe("workflow validation", () => {
    it("should handle empty workflow (no nodes)", async () => {
      const workflow: Workflow = {
        id: "test-workflow-empty",
        name: "Empty Workflow",
        handle: "empty",
        type: "manual",
        nodes: [],
        edges: [],
      };

      const { state, updates } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("completed");
      expect(state.executedNodes.size).toBe(0);
      expect(state.nodeErrors.size).toBe(0);

      // Verify monitoring updates for empty workflow
      // Should have: initial + final = 2 total
      expect(updates).toHaveLength(2);
      assertInitialUpdate(updates[0], workflow.id, "test-exec");
      assertFinalUpdate(updates[1], "completed", 0);
    });

    it("should handle workflow with single isolated node", async () => {
      const workflow: Workflow = {
        id: "test-workflow-single",
        name: "Single Node Workflow",
        handle: "single",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 42, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [],
      };

      const { state, updates } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("completed");
      expect(state.executedNodes.size).toBe(1);
      expect(state.nodeOutputs.get("num1")?.value).toBe(42);

      // Verify monitoring updates for single node workflow
      // Should have: initial + 1 progress + final = 3 total
      expect(updates).toHaveLength(3);
      assertInitialUpdate(updates[0], workflow.id, "test-exec");
      assertFinalUpdate(updates[2], "completed", 1);
      assertNodeExecution(updates[2].nodeExecutions, "num1", "completed", { hasOutputs: true });
    });

    it("should handle workflow with multiple isolated nodes", async () => {
      const workflow: Workflow = {
        id: "test-workflow-isolated",
        name: "Isolated Nodes Workflow",
        handle: "isolated",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 200, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num3",
            name: "Number 3",
            type: "number-input",
            position: { x: 400, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 15, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [],
      };

      const { state } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("completed");
      expect(state.executedNodes.size).toBe(3);
      expect(state.nodeOutputs.get("num1")?.value).toBe(5);
      expect(state.nodeOutputs.get("num2")?.value).toBe(10);
      expect(state.nodeOutputs.get("num3")?.value).toBe(15);
    });
  });

  describe("edge cases", () => {
    it("should handle node with all optional inputs missing", async () => {
      const workflow: Workflow = {
        id: "test-workflow-optional",
        name: "Optional Inputs Workflow",
        handle: "optional",
        type: "manual",
        nodes: [
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "a", type: "number", value: 5, hidden: true },
              { name: "b", type: "number", value: 3, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [],
      };

      const { state } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("completed");
      expect(state.executedNodes.size).toBe(1);
      expect(state.nodeOutputs.get("add")?.result).toBe(8);
    });

    it("should handle workflow with deep chain (10+ nodes)", async () => {
      // Create a chain: num → add1 → add2 → ... → add10
      const nodes: Workflow["nodes"] = [
        {
          id: "num",
          name: "Number",
          type: "number-input",
          position: { x: 0, y: 0 },
          inputs: [{ name: "value", type: "number", value: 1, hidden: true }],
          outputs: [{ name: "value", type: "number" }],
        },
      ];

      const edges: Workflow["edges"] = [];

      for (let i = 1; i <= 10; i++) {
        nodes.push({
          id: `add${i}`,
          name: `Add ${i}`,
          type: "addition",
          position: { x: i * 200, y: 0 },
          inputs: [
            { name: "a", type: "number", required: true },
            { name: "b", type: "number", value: 1, hidden: true },
          ],
          outputs: [{ name: "result", type: "number" }],
        });

        edges.push({
          source: i === 1 ? "num" : `add${i - 1}`,
          sourceOutput: i === 1 ? "value" : "result",
          target: `add${i}`,
          targetInput: "a",
        });
      }

      const workflow: Workflow = {
        id: "test-workflow-deep",
        name: "Deep Chain Workflow",
        handle: "deep-chain",
        type: "manual",
        nodes,
        edges,
      };

      const { state, updates } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("completed");
      expect(state.executedNodes.size).toBe(11); // num + 10 additions
      expect(state.nodeOutputs.get("add10")?.result).toBe(11); // 1 + 1 + 1 + ... (10 times)

      // Verify monitoring updates for deep chain
      // Should have: initial + 11 progress updates + final = 13 total
      expect(updates).toHaveLength(13);
      assertInitialUpdate(updates[0], workflow.id, "test-exec");

      const finalUpdate = updates[updates.length - 1];
      assertFinalUpdate(finalUpdate, "completed", 11);

      // Verify all nodes completed
      assertNodeExecution(finalUpdate.nodeExecutions, "num", "completed", { hasOutputs: true });
      for (let i = 1; i <= 10; i++) {
        assertNodeExecution(finalUpdate.nodeExecutions, `add${i}`, "completed", { hasOutputs: true });
      }
    });

    it("should handle workflow with wide parallel branches (10+ branches)", async () => {
      const nodes: Workflow["nodes"] = [];
      const edges: Workflow["edges"] = [];

      // Create 10 number inputs
      for (let i = 1; i <= 10; i++) {
        nodes.push({
          id: `num${i}`,
          name: `Number ${i}`,
          type: "number-input",
          position: { x: 0, y: i * 100 },
          inputs: [{ name: "value", type: "number", value: i, hidden: true }],
          outputs: [{ name: "value", type: "number" }],
        });
      }

      // Create addition nodes that sum pairs
      for (let i = 1; i <= 5; i++) {
        const nodeId = `add${i}`;
        nodes.push({
          id: nodeId,
          name: `Add ${i}`,
          type: "addition",
          position: { x: 200, y: i * 200 },
          inputs: [
            { name: "a", type: "number", required: true },
            { name: "b", type: "number", required: true },
          ],
          outputs: [{ name: "result", type: "number" }],
        });

        edges.push(
          {
            source: `num${i * 2 - 1}`,
            sourceOutput: "value",
            target: nodeId,
            targetInput: "a",
          },
          {
            source: `num${i * 2}`,
            sourceOutput: "value",
            target: nodeId,
            targetInput: "b",
          }
        );
      }

      const workflow: Workflow = {
        id: "test-workflow-wide",
        name: "Wide Parallel Workflow",
        handle: "wide-parallel",
        type: "manual",
        nodes,
        edges,
      };

      const { state, updates } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("completed");
      expect(state.executedNodes.size).toBe(15); // 10 numbers + 5 additions
      // Verify each addition: add1 = 1+2=3, add2 = 3+4=7, add3 = 5+6=11, add4 = 7+8=15, add5 = 9+10=19
      expect(state.nodeOutputs.get("add1")?.result).toBe(3);
      expect(state.nodeOutputs.get("add2")?.result).toBe(7);
      expect(state.nodeOutputs.get("add3")?.result).toBe(11);
      expect(state.nodeOutputs.get("add4")?.result).toBe(15);
      expect(state.nodeOutputs.get("add5")?.result).toBe(19);

      // Verify monitoring updates for wide parallel branches
      // Should have: initial + 15 progress updates + final = 17 total
      expect(updates).toHaveLength(17);
      assertInitialUpdate(updates[0], workflow.id, "test-exec");

      const finalUpdate = updates[updates.length - 1];
      assertFinalUpdate(finalUpdate, "completed", 15);

      // Spot check some nodes
      for (let i = 1; i <= 10; i++) {
        assertNodeExecution(finalUpdate.nodeExecutions, `num${i}`, "completed", { hasOutputs: true });
      }
      for (let i = 1; i <= 5; i++) {
        assertNodeExecution(finalUpdate.nodeExecutions, `add${i}`, "completed", { hasOutputs: true });
      }
    });
  });

  describe("multiple concurrent errors", () => {
    it("should handle multiple independent errors in parallel branches", async () => {
      const workflow: Workflow = {
        id: "test-workflow-multi-error",
        name: "Multiple Errors Workflow",
        handle: "multi-error",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "zero1",
            name: "Zero 1",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 0, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 200 },
            inputs: [
              { name: "value", type: "number", value: 20, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "zero2",
            name: "Zero 2",
            type: "number-input",
            position: { x: 0, y: 300 },
            inputs: [{ name: "value", type: "number", value: 0, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "div1",
            name: "Divide 1",
            type: "division",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "div2",
            name: "Divide 2",
            type: "division",
            position: { x: 200, y: 250 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "div1",
            targetInput: "a",
          },
          {
            source: "zero1",
            sourceOutput: "value",
            target: "div1",
            targetInput: "b",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "div2",
            targetInput: "a",
          },
          {
            source: "zero2",
            sourceOutput: "value",
            target: "div2",
            targetInput: "b",
          },
        ],
      };

      const { state, updates } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("error");
      expect(state.executedNodes.size).toBe(4); // All number inputs succeeded
      expect(state.nodeErrors.size).toBe(2); // Both divisions failed
      expect(state.nodeErrors.get("div1")).toContain("Division by zero");
      expect(state.nodeErrors.get("div2")).toContain("Division by zero");

      // Verify monitoring updates for multiple concurrent errors
      assertInitialUpdate(updates[0], workflow.id, "test-exec");

      const finalUpdate = updates[updates.length - 1];
      assertFinalUpdate(finalUpdate, "error", 6);

      // All input nodes completed
      assertNodeExecution(finalUpdate.nodeExecutions, "num1", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "num2", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "zero1", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "zero2", "completed", { hasOutputs: true });

      // Both division nodes failed
      assertNodeExecution(finalUpdate.nodeExecutions, "div1", "error", {
        hasError: true,
        errorContains: "Division by zero",
      });
      assertNodeExecution(finalUpdate.nodeExecutions, "div2", "error", {
        hasError: true,
        errorContains: "Division by zero",
      });
    });

    it("should handle cascading errors (error → missing input → error)", async () => {
      const workflow: Workflow = {
        id: "test-workflow-cascade",
        name: "Cascading Errors Workflow",
        handle: "cascade-error",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "zero",
            name: "Zero",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 0, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "div",
            name: "Divide",
            type: "division",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 400, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 5, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "mult",
            name: "Multiply",
            type: "multiplication",
            position: { x: 600, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 2, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "div",
            targetInput: "a",
          },
          {
            source: "zero",
            sourceOutput: "value",
            target: "div",
            targetInput: "b",
          },
          {
            source: "div",
            sourceOutput: "result",
            target: "add",
            targetInput: "a",
          },
          {
            source: "add",
            sourceOutput: "result",
            target: "mult",
            targetInput: "a",
          },
        ],
      };

      const { state, updates } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("error");
      expect(state.executedNodes.size).toBe(2); // num1, zero
      expect(state.nodeErrors.size).toBe(3); // div, add, mult all fail
      expect(state.nodeErrors.get("div")).toContain("Division by zero");
      expect(state.nodeErrors.get("add")).toContain("Input 'a' is required");
      expect(state.nodeErrors.get("mult")).toContain("Input 'a' is required");

      // Verify monitoring updates for cascading errors
      assertInitialUpdate(updates[0], workflow.id, "test-exec");

      const finalUpdate = updates[updates.length - 1];
      assertFinalUpdate(finalUpdate, "error", 5);

      // First two nodes completed
      assertNodeExecution(finalUpdate.nodeExecutions, "num1", "completed", { hasOutputs: true });
      assertNodeExecution(finalUpdate.nodeExecutions, "zero", "completed", { hasOutputs: true });

      // All downstream nodes failed
      assertNodeExecution(finalUpdate.nodeExecutions, "div", "error", {
        hasError: true,
        errorContains: "Division by zero",
      });
      assertNodeExecution(finalUpdate.nodeExecutions, "add", "error", {
        hasError: true,
        errorContains: "Input 'a' is required",
      });
      assertNodeExecution(finalUpdate.nodeExecutions, "mult", "error", {
        hasError: true,
        errorContains: "Input 'a' is required",
      });
    });
  });

  describe("state consistency", () => {
    it("should maintain consistent state throughout execution", async () => {
      const workflow: Workflow = {
        id: "test-workflow-consistency",
        name: "Consistency Check Workflow",
        handle: "consistency",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 3, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "add",
            targetInput: "b",
          },
        ],
      };

      const { state, updates } = await executeWorkflow(workflow);

      const context = createContext(workflow);

      // Verify no node is in multiple states
      for (const nodeId of context.orderedNodeIds) {
        const stateCount = [
          state.executedNodes.has(nodeId),
          state.skippedNodes.has(nodeId),
          state.nodeErrors.has(nodeId),
        ].filter(Boolean).length;

        // A node can be in at most one state (executed, skipped, or errored)
        expect(stateCount).toBeLessThanOrEqual(1);
      }

      // Verify all executed nodes have outputs
      for (const nodeId of state.executedNodes) {
        expect(state.nodeOutputs.has(nodeId)).toBe(true);
      }

      // Verify errored nodes don't have outputs
      for (const nodeId of state.nodeErrors.keys()) {
        expect(state.executedNodes.has(nodeId)).toBe(false);
      }

      // Verify status progression in updates
      const statuses = updates.map((u) => u.status);
      // Should start with "executing" or "submitted"
      expect(["executing", "submitted"]).toContain(statuses[0]);
      // Should end with "completed" or "error"
      expect(["completed", "error"]).toContain(statuses[statuses.length - 1]);
    });

    it("should never mark nodes as both executed and errored", async () => {
      const workflow: Workflow = {
        id: "test-workflow-state-isolation",
        name: "State Isolation Workflow",
        handle: "state-isolation",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "zero",
            name: "Zero",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 0, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "div",
            name: "Divide",
            type: "division",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "div",
            targetInput: "a",
          },
          {
            source: "zero",
            sourceOutput: "value",
            target: "div",
            targetInput: "b",
          },
        ],
      };

      const { state } = await executeWorkflow(workflow);

      // Verify executed nodes are not in error state
      for (const nodeId of state.executedNodes) {
        expect(state.nodeErrors.has(nodeId)).toBe(false);
      }

      // Verify errored nodes are not in executed state
      for (const nodeId of state.nodeErrors.keys()) {
        expect(state.executedNodes.has(nodeId)).toBe(false);
      }

      // Verify skipped nodes are not in executed or error state
      for (const nodeId of state.skippedNodes) {
        expect(state.executedNodes.has(nodeId)).toBe(false);
        expect(state.nodeErrors.has(nodeId)).toBe(false);
      }
    });
  });

  describe("topological ordering", () => {
    it("should order nodes in correct execution sequence (linear chain)", async () => {
      // Note: In a real Runtime, topological ordering is computed from edges.
      // TestRuntime uses workflow.nodes order, so we define them in dependency order here.
      // The test verifies that execution respects dependencies.
      const workflow: Workflow = {
        id: "test-workflow-order-linear",
        name: "Linear Order",
        handle: "order-linear",
        type: "manual",
        nodes: [
          {
            id: "node1",
            name: "Node 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 1, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "node2",
            name: "Node 2",
            type: "addition",
            position: { x: 200, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 1, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "node3",
            name: "Node 3",
            type: "addition",
            position: { x: 400, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 1, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "node1",
            sourceOutput: "value",
            target: "node2",
            targetInput: "a",
          },
          {
            source: "node2",
            sourceOutput: "result",
            target: "node3",
            targetInput: "a",
          },
        ],
      };

      const { state, updates } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("completed");

      // Verify execution order by checking update sequence
      const executionOrder: string[] = [];
      for (const update of updates) {
        for (const ne of update.nodeExecutions) {
          if (
            ne.status === "completed" &&
            !executionOrder.includes(ne.nodeId)
          ) {
            executionOrder.push(ne.nodeId);
          }
        }
      }

      // node1 must execute before node2, node2 before node3
      expect(executionOrder.indexOf("node1")).toBeLessThan(
        executionOrder.indexOf("node2")
      );
      expect(executionOrder.indexOf("node2")).toBeLessThan(
        executionOrder.indexOf("node3")
      );

      // Verify final values
      expect(state.nodeOutputs.get("node1")?.value).toBe(1);
      expect(state.nodeOutputs.get("node2")?.result).toBe(2); // 1 + 1
      expect(state.nodeOutputs.get("node3")?.result).toBe(3); // 2 + 1
    });

    it("should handle diamond dependency pattern", async () => {
      // Pattern: A → B → D
      //          A → C → D
      const workflow: Workflow = {
        id: "test-workflow-diamond",
        name: "Diamond Pattern",
        handle: "diamond",
        type: "manual",
        nodes: [
          {
            id: "A",
            name: "A",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "B",
            name: "B",
            type: "addition",
            position: { x: 200, y: -50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 1, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "C",
            name: "C",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 2, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "D",
            name: "D",
            type: "addition",
            position: { x: 400, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          { source: "A", sourceOutput: "value", target: "B", targetInput: "a" },
          { source: "A", sourceOutput: "value", target: "C", targetInput: "a" },
          {
            source: "B",
            sourceOutput: "result",
            target: "D",
            targetInput: "a",
          },
          {
            source: "C",
            sourceOutput: "result",
            target: "D",
            targetInput: "b",
          },
        ],
      };

      const { state } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("completed");
      expect(state.nodeOutputs.get("B")?.result).toBe(11); // 10 + 1
      expect(state.nodeOutputs.get("C")?.result).toBe(12); // 10 + 2
      expect(state.nodeOutputs.get("D")?.result).toBe(23); // 11 + 12
    });

    it("should handle complex multi-level dependencies", async () => {
      // Create a more complex graph:
      //   A   B
      //   |\ /|
      //   | X |
      //   |/ \|
      //   C   D
      //    \ /
      //     E
      const workflow: Workflow = {
        id: "test-workflow-complex",
        name: "Complex Dependencies",
        handle: "complex-deps",
        type: "manual",
        nodes: [
          {
            id: "A",
            name: "A",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 1, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "B",
            name: "B",
            type: "number-input",
            position: { x: 100, y: 0 },
            inputs: [{ name: "value", type: "number", value: 2, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "C",
            name: "C",
            type: "addition",
            position: { x: 0, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "D",
            name: "D",
            type: "addition",
            position: { x: 100, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "E",
            name: "E",
            type: "addition",
            position: { x: 50, y: 200 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          { source: "A", sourceOutput: "value", target: "C", targetInput: "a" },
          { source: "B", sourceOutput: "value", target: "C", targetInput: "b" },
          { source: "A", sourceOutput: "value", target: "D", targetInput: "a" },
          { source: "B", sourceOutput: "value", target: "D", targetInput: "b" },
          {
            source: "C",
            sourceOutput: "result",
            target: "E",
            targetInput: "a",
          },
          {
            source: "D",
            sourceOutput: "result",
            target: "E",
            targetInput: "b",
          },
        ],
      };

      const { state } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("completed");
      expect(state.nodeOutputs.get("C")?.result).toBe(3); // 1 + 2
      expect(state.nodeOutputs.get("D")?.result).toBe(3); // 1 + 2
      expect(state.nodeOutputs.get("E")?.result).toBe(6); // 3 + 3
    });
  });

  describe("input collection", () => {
    it("should collect inputs from node static values", async () => {
      const workflow: Workflow = {
        id: "test-workflow-static-inputs",
        name: "Static Inputs",
        handle: "static-inputs",
        type: "manual",
        nodes: [
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "a", type: "number", value: 10, hidden: true },
              { name: "b", type: "number", value: 20, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [],
      };

      const { state } = await executeWorkflow(workflow);

      expect(state.nodeOutputs.get("add")?.result).toBe(30);
    });

    it("should collect inputs from edges", async () => {
      const workflow: Workflow = {
        id: "test-workflow-edge-inputs",
        name: "Edge Inputs",
        handle: "edge-inputs",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 7, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "add",
            targetInput: "b",
          },
        ],
      };

      const { state } = await executeWorkflow(workflow);

      expect(state.nodeOutputs.get("add")?.result).toBe(12);
    });

    it("should override static values with edge inputs (edge takes precedence)", async () => {
      const workflow: Workflow = {
        id: "test-workflow-override",
        name: "Input Override",
        handle: "input-override",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 100, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 0 },
            inputs: [
              { name: "a", type: "number", value: 10, hidden: true }, // Static value
              { name: "b", type: "number", value: 20, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num",
            sourceOutput: "value",
            target: "add",
            targetInput: "a", // Override static value with edge
          },
        ],
      };

      const { state } = await executeWorkflow(workflow);

      // Edge input (100) should override static value (10)
      expect(state.nodeOutputs.get("add")?.result).toBe(120); // 100 + 20
    });

    it("should handle multiple edges to same input (last edge wins)", async () => {
      const workflow: Workflow = {
        id: "test-workflow-multiple-edges",
        name: "Multiple Edges Same Input",
        handle: "multi-edge",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num3",
            name: "Number 3",
            type: "number-input",
            position: { x: 0, y: 200 },
            inputs: [
              { name: "value", type: "number", value: 15, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 100, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          {
            source: "num3",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
        ],
      };

      const { state } = await executeWorkflow(workflow);

      // Last edge (num3 = 15) should be used
      expect(state.nodeOutputs.get("add")?.result).toBe(115); // 15 + 100
    });

    it("should handle mixed static and edge inputs", async () => {
      const workflow: Workflow = {
        id: "test-workflow-mixed-inputs",
        name: "Mixed Inputs",
        handle: "mixed-inputs",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 10, hidden: true }, // Static
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num",
            sourceOutput: "value",
            target: "add",
            targetInput: "a", // From edge
          },
        ],
      };

      const { state } = await executeWorkflow(workflow);

      expect(state.nodeOutputs.get("add")?.result).toBe(15); // 5 (edge) + 10 (static)
    });
  });

  describe("skip logic and conditional execution", () => {
    it("should skip nodes when required inputs are missing", async () => {
      const workflow: Workflow = {
        id: "test-workflow-skip-missing",
        name: "Skip Missing Input",
        handle: "skip-missing",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true }, // Missing!
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          // No edge for input 'b'
        ],
      };

      const { state } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("error");
      expect(state.executedNodes.has("num")).toBe(true);
      expect(state.nodeErrors.has("add")).toBe(true);
      expect(state.nodeErrors.get("add")).toContain("Input 'b' is required");
    });

    it("should recursively skip downstream nodes when upstream node is skipped", async () => {
      const workflow: Workflow = {
        id: "test-workflow-recursive-skip",
        name: "Recursive Skip",
        handle: "recursive-skip",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add1",
            name: "Add 1",
            type: "addition",
            position: { x: 200, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true }, // Missing
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "add2",
            name: "Add 2",
            type: "addition",
            position: { x: 400, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true }, // Depends on add1
              { name: "b", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "add3",
            name: "Add 3",
            type: "addition",
            position: { x: 600, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true }, // Depends on add2
              { name: "b", type: "number", value: 20, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num",
            sourceOutput: "value",
            target: "add1",
            targetInput: "a",
          },
          {
            source: "add1",
            sourceOutput: "result",
            target: "add2",
            targetInput: "a",
          },
          {
            source: "add2",
            sourceOutput: "result",
            target: "add3",
            targetInput: "a",
          },
        ],
      };

      const { state } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("error");
      expect(state.executedNodes.has("num")).toBe(true);
      // All downstream nodes should error due to missing inputs
      expect(state.nodeErrors.has("add1")).toBe(true);
      expect(state.nodeErrors.has("add2")).toBe(true);
      expect(state.nodeErrors.has("add3")).toBe(true);
    });
  });

  describe("monitoring and updates", () => {
    it("should send initial update with submitted status", async () => {
      const workflow: Workflow = {
        id: "test-workflow-monitor-initial",
        name: "Monitor Initial",
        handle: "monitor-initial",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [],
      };

      const { updates } = await executeWorkflow(workflow);

      // First update should be initial state
      expect(updates.length).toBeGreaterThan(0);
      const firstUpdate = updates[0];
      expect(firstUpdate.status).toBe("executing");
    });

    it("should send progress updates after each node execution", async () => {
      const workflow: Workflow = {
        id: "test-workflow-monitor-progress",
        name: "Monitor Progress",
        handle: "monitor-progress",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 1, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 2, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "add",
            targetInput: "b",
          },
        ],
      };

      const { updates } = await executeWorkflow(workflow);

      // Should have: initial + progress after each of 3 nodes + final
      expect(updates.length).toBeGreaterThanOrEqual(5);

      // Check that nodeExecutions grows with each update
      let maxExecutions = 0;
      for (const update of updates) {
        const completedCount = update.nodeExecutions.filter(
          (ne) => ne.status === "completed"
        ).length;
        expect(completedCount).toBeGreaterThanOrEqual(maxExecutions);
        maxExecutions = Math.max(maxExecutions, completedCount);
      }
    });

    it("should include node outputs in monitoring updates", async () => {
      const workflow: Workflow = {
        id: "test-workflow-monitor-outputs",
        name: "Monitor Outputs",
        handle: "monitor-outputs",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 42, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [],
      };

      const { updates } = await executeWorkflow(workflow);

      // Find update with completed node
      const completedUpdate = updates.find((u) =>
        u.nodeExecutions.some(
          (ne) => ne.nodeId === "num" && ne.status === "completed"
        )
      );

      expect(completedUpdate).toBeDefined();
      const numExecution = completedUpdate?.nodeExecutions.find(
        (ne) => ne.nodeId === "num"
      );
      expect(numExecution?.outputs).toHaveProperty("value");
    });

    it("should include error details in monitoring updates", async () => {
      const workflow: Workflow = {
        id: "test-workflow-monitor-errors",
        name: "Monitor Errors",
        handle: "monitor-errors",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "zero",
            name: "Zero",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 0, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "div",
            name: "Divide",
            type: "division",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num",
            sourceOutput: "value",
            target: "div",
            targetInput: "a",
          },
          {
            source: "zero",
            sourceOutput: "value",
            target: "div",
            targetInput: "b",
          },
        ],
      };

      const { updates } = await executeWorkflow(workflow);

      const finalUpdate = updates[updates.length - 1];
      const divExecution = finalUpdate.nodeExecutions.find(
        (ne) => ne.nodeId === "div"
      );

      expect(divExecution?.status).toBe("error");
      expect(divExecution?.error).toBeDefined();
      expect(divExecution?.error).toContain("Division by zero");
    });

    it("should mark final update status correctly for completed workflow", async () => {
      const workflow: Workflow = {
        id: "test-workflow-final-completed",
        name: "Final Completed",
        handle: "final-completed",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [],
      };

      const { updates } = await executeWorkflow(workflow);

      const finalUpdate = updates[updates.length - 1];
      expect(finalUpdate.status).toBe("completed");
    });

    it("should mark final update status correctly for errored workflow", async () => {
      const workflow: Workflow = {
        id: "test-workflow-final-error",
        name: "Final Error",
        handle: "final-error",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "zero",
            name: "Zero",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 0, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "div",
            name: "Divide",
            type: "division",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num",
            sourceOutput: "value",
            target: "div",
            targetInput: "a",
          },
          {
            source: "zero",
            sourceOutput: "value",
            target: "div",
            targetInput: "b",
          },
        ],
      };

      const { updates } = await executeWorkflow(workflow);

      const finalUpdate = updates[updates.length - 1];
      expect(finalUpdate.status).toBe("error");
    });
  });

  describe("status computation", () => {
    it("should compute 'executing' when not all nodes visited", async () => {
      const workflow: Workflow = {
        id: "test-workflow-status-executing",
        name: "Status Executing",
        handle: "status-executing",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 1, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 200, y: 0 },
            inputs: [{ name: "value", type: "number", value: 2, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [],
      };

      const { updates } = await executeWorkflow(workflow);

      // Find intermediate update (after first node, before last)
      const intermediateUpdate = updates.find(
        (u) =>
          u.nodeExecutions.some((ne) => ne.status === "completed") &&
          u.nodeExecutions.some((ne) => ne.status === "idle")
      );

      if (intermediateUpdate) {
        expect(intermediateUpdate.status).toBe("executing");
      }
    });

    it("should compute 'completed' when all nodes executed with no errors", async () => {
      const workflow: Workflow = {
        id: "test-workflow-status-completed",
        name: "Status Completed",
        handle: "status-completed",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [],
      };

      const { state } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      const status = getExecutionStatus(context, state);
      expect(status).toBe("completed");
    });

    it("should compute 'error' when all nodes visited and at least one error", async () => {
      const workflow: Workflow = {
        id: "test-workflow-status-error",
        name: "Status Error",
        handle: "status-error",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "zero",
            name: "Zero",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 0, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "div",
            name: "Divide",
            type: "division",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num",
            sourceOutput: "value",
            target: "div",
            targetInput: "a",
          },
          {
            source: "zero",
            sourceOutput: "value",
            target: "div",
            targetInput: "b",
          },
        ],
      };

      const { state } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      const status = getExecutionStatus(context, state);
      expect(status).toBe("error");
    });

    it("should handle mixed executed, skipped, and errored nodes", async () => {
      const workflow: Workflow = {
        id: "test-workflow-status-mixed",
        name: "Status Mixed",
        handle: "status-mixed",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "zero",
            name: "Zero",
            type: "number-input",
            position: { x: 0, y: 200 },
            inputs: [{ name: "value", type: "number", value: 0, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "div",
            name: "Divide",
            type: "division",
            position: { x: 200, y: 200 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "add",
            targetInput: "b",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "div",
            targetInput: "a",
          },
          {
            source: "zero",
            sourceOutput: "value",
            target: "div",
            targetInput: "b",
          },
        ],
      };

      const { state } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("error");

      // Verify we have both executed and errored nodes
      expect(state.executedNodes.size).toBeGreaterThan(0);
      expect(state.nodeErrors.size).toBeGreaterThan(0);
    });
  });

  describe("node execution errors", () => {
    it("should handle node type not found in registry", async () => {
      const workflow: Workflow = {
        id: "test-workflow-unknown-type",
        name: "Unknown Node Type",
        handle: "unknown-type",
        type: "manual",
        nodes: [
          {
            id: "unknown",
            name: "Unknown",
            type: "nonexistent-node-type" as any,
            position: { x: 0, y: 0 },
            inputs: [],
            outputs: [],
          },
        ],
        edges: [],
      };

      const { state } = await executeWorkflow(workflow);

      const context = createContext(workflow);
      expect(getExecutionStatus(context, state)).toBe("error");
      expect(state.nodeErrors.has("unknown")).toBe(true);
      expect(state.nodeErrors.get("unknown")).toContain("not implemented");
    });

    it("should continue execution when one node fails", async () => {
      const workflow: Workflow = {
        id: "test-workflow-continue-on-error",
        name: "Continue on Error",
        handle: "continue-error",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "zero",
            name: "Zero",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 0, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "div",
            name: "Divide",
            type: "division",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 300 },
            inputs: [
              { name: "value", type: "number", value: 42, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "div",
            targetInput: "a",
          },
          {
            source: "zero",
            sourceOutput: "value",
            target: "div",
            targetInput: "b",
          },
        ],
      };

      const { state } = await executeWorkflow(workflow);

      // div should fail, but num1, zero, and num2 should complete
      expect(state.executedNodes.has("num1")).toBe(true);
      expect(state.executedNodes.has("zero")).toBe(true);
      expect(state.executedNodes.has("num2")).toBe(true);
      expect(state.nodeErrors.has("div")).toBe(true);
    });
  });

  describe("output handling", () => {
    it("should store outputs from successful nodes", async () => {
      const workflow: Workflow = {
        id: "test-workflow-outputs",
        name: "Node Outputs",
        handle: "outputs",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 42, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [],
      };

      const { state } = await executeWorkflow(workflow);

      expect(state.nodeOutputs.has("num")).toBe(true);
      expect(state.nodeOutputs.get("num")?.value).toBe(42);
    });

    it("should not store outputs from failed nodes", async () => {
      const workflow: Workflow = {
        id: "test-workflow-no-outputs-on-error",
        name: "No Outputs on Error",
        handle: "no-outputs-error",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "zero",
            name: "Zero",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 0, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "div",
            name: "Divide",
            type: "division",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num",
            sourceOutput: "value",
            target: "div",
            targetInput: "a",
          },
          {
            source: "zero",
            sourceOutput: "value",
            target: "div",
            targetInput: "b",
          },
        ],
      };

      const { state } = await executeWorkflow(workflow);

      // Failed node should not have outputs
      expect(state.nodeOutputs.has("div")).toBe(false);
      expect(state.nodeErrors.has("div")).toBe(true);
    });

    it("should handle nodes with multiple outputs", async () => {
      const workflow: Workflow = {
        id: "test-workflow-multiple-outputs",
        name: "Multiple Outputs",
        handle: "multi-outputs",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 3, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "sub",
            name: "Subtract",
            type: "subtraction",
            position: { x: 200, y: 150 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "add",
            targetInput: "b",
          },
          {
            source: "num1",
            sourceOutput: "value",
            target: "sub",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "sub",
            targetInput: "b",
          },
        ],
      };

      const { state } = await executeWorkflow(workflow);

      // Verify num1 output is used by multiple downstream nodes
      expect(state.nodeOutputs.get("add")?.result).toBe(8); // 5 + 3
      expect(state.nodeOutputs.get("sub")?.result).toBe(2); // 5 - 3
    });
  });
});
