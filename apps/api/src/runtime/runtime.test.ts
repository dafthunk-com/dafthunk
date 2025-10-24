import type { Workflow, WorkflowExecution } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { TestNodeRegistry } from "../nodes/test-node-registry";
import { ExecutionEngine } from "./execution-engine";
import { ErrorHandler } from "./error-handler";
import { ExecutionMonitoring } from "./execution-monitoring";
import { ResourceProvider } from "./resource-provider";
import { SkipHandler } from "./skip-handler";
import type { ExecutionState, WorkflowExecutionContext } from "./types";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";

/**
 * Integration tests for Runtime execution with real math nodes.
 * Tests exercise the full execution engine with monitoring.
 */
describe("Runtime Integration", () => {
  // Mock Analytics Engine binding
  const testEnv = {
    COMPUTE: {
      writeDataPoint: () => {}, // Mock analytics write
    },
  } as any;

  // Mock execution monitoring
  let monitoringSendUpdate: ReturnType<typeof vi.fn>;
  let monitoring: ExecutionMonitoring;

  const createMonitoring = () => {
    monitoringSendUpdate = vi.fn().mockResolvedValue(undefined);
    monitoring = {
      sendUpdate: monitoringSendUpdate,
    } as any;
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
    status: "executing",
  });

  // Helper to execute a workflow sequentially and track monitoring updates
  const executeWorkflow = async (
    workflow: Workflow,
    executionId: string = "test-exec"
  ): Promise<{
    state: ExecutionState;
    updates: WorkflowExecution[];
  }> => {
    const nodeRegistry = new TestNodeRegistry(testEnv, true);
    const resourceProvider = new ResourceProvider(testEnv);
    const errorHandler = new ErrorHandler(true);
    const skipHandler = new SkipHandler(nodeRegistry);
    const monitoring = createMonitoring();

    // Create tool registry
    const toolRegistry = new CloudflareToolRegistry(
      nodeRegistry,
      (nodeId: string, inputs: Record<string, any>) =>
        resourceProvider.createToolContext(nodeId, inputs)
    );
    resourceProvider.setToolRegistry(toolRegistry);

    const executionEngine = new ExecutionEngine(
      testEnv,
      nodeRegistry,
      resourceProvider,
      skipHandler,
      errorHandler
    );
    skipHandler.setExecutionEngine(executionEngine);

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
      state = await executionEngine.executeNode(
        context,
        state,
        nodeId,
        undefined,
        undefined
      );

      // Send progress update after each node (simulating Runtime behavior)
      await monitoring.sendUpdate({
        id: executionId,
        workflowId: workflow.id,
        status: state.status,
        nodeExecutions: Array.from(state.executedNodes).map((nodeId) => ({
          nodeId,
          status: state.nodeErrors.has(nodeId) ? "error" : "completed",
          error: state.nodeErrors.get(nodeId),
          outputs: state.nodeOutputs.get(nodeId) as any,
        })),
      } as WorkflowExecution);
    }

    // Update final status based on execution results
    state = errorHandler.updateStatus(context, state);

    // Send final update
    await monitoring.sendUpdate({
      id: executionId,
      workflowId: workflow.id,
      status: state.status,
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
      expect(state.status).toBe("completed");
      expect(state.executedNodes.size).toBe(4);
      expect(state.nodeErrors.size).toBe(0);
      expect(state.nodeOutputs.get("add")?.result).toBe(8); // 5 + 3
      expect(state.nodeOutputs.get("mult")?.result).toBe(16); // 8 * 2

      // Verify monitoring updates
      // Should have: initial + 4 progress updates (one per node) + final = 6 total
      expect(updates).toHaveLength(6);

      // Initial update
      expect(updates[0].status).toBe("executing");
      expect(updates[0].nodeExecutions).toHaveLength(0);

      // Progress updates after each node
      expect(updates[1].nodeExecutions).toHaveLength(1); // After num1
      expect(updates[2].nodeExecutions).toHaveLength(2); // After num2
      expect(updates[3].nodeExecutions).toHaveLength(3); // After add
      expect(updates[4].nodeExecutions).toHaveLength(4); // After mult

      // Final update
      expect(updates[5].status).toBe("completed");
      expect(updates[5].nodeExecutions).toHaveLength(4);
      expect(updates[5].nodeExecutions.every(ne => ne.status === "completed")).toBe(true);
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
            inputs: [{ name: "value", type: "number", value: 10, hidden: true }],
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

      const { state } = await executeWorkflow(workflow);

      expect(state.status).toBe("completed");
      expect(state.executedNodes.size).toBe(7);
      expect(state.nodeErrors.size).toBe(0);
      expect(state.nodeOutputs.get("add1")?.result).toBe(15); // 10 + 5
      expect(state.nodeOutputs.get("add2")?.result).toBe(5); // 3 + 2
      expect(state.nodeOutputs.get("mult")?.result).toBe(75); // 15 * 5
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

      const { state } = await executeWorkflow(workflow);

      expect(state.status).toBe("completed");
      expect(state.executedNodes.size).toBe(5);
      expect(state.nodeErrors.size).toBe(0);
      // num1=2, num2=3, add=5, mult=20, sub=19
      expect(state.nodeOutputs.get("add")?.result).toBe(5);
      expect(state.nodeOutputs.get("mult")?.result).toBe(20);
      expect(state.nodeOutputs.get("sub")?.result).toBe(19);
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
            inputs: [{ name: "value", type: "number", value: 10, hidden: true }],
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
      expect(state.status).toBe("error");
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
      const divExecution = finalUpdate.nodeExecutions.find(ne => ne.nodeId === "div");
      expect(divExecution?.status).toBe("error");
      expect(divExecution?.error).toContain("Division by zero");

      // num1 and num2 should be completed
      const num1Execution = finalUpdate.nodeExecutions.find(ne => ne.nodeId === "num1");
      const num2Execution = finalUpdate.nodeExecutions.find(ne => ne.nodeId === "num2");
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

      const { state } = await executeWorkflow(workflow);

      expect(state.status).toBe("error");
      expect(state.executedNodes.size).toBe(1); // Only num1 succeeded
      expect(state.nodeErrors.size).toBe(1);
      expect(state.nodeErrors.get("add")).toContain("Required input 'b' missing");
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
            inputs: [{ name: "value", type: "number", value: 10, hidden: true }],
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

      const { state } = await executeWorkflow(workflow);

      expect(state.status).toBe("error");
      expect(state.executedNodes.size).toBe(2); // Only num1 and num2
      expect(state.nodeErrors.size).toBe(2); // div failed, add failed due to missing input
      expect(state.nodeErrors.get("div")).toContain("Division by zero");
      expect(state.nodeErrors.get("add")).toContain("Required input 'a' missing");
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
      expect(state.status).toBe("error"); // Should be error, NOT executing
      expect(state.executedNodes.size).toBe(1); // Only addition completed
      expect(state.nodeErrors.size).toBe(2); // Both subtraction and multiplication failed

      // Subtraction should fail due to missing input 'b'
      expect(state.nodeErrors.get("subtraction")).toContain("Required input 'b' missing");

      // Multiplication should fail due to missing input from failed subtraction
      expect(state.nodeErrors.get("multiplication")).toContain("Required input 'a' missing");

      // Verify monitoring updates match what Runtime sends
      // Updates: initial + 3 progress (addition, subtraction, multiplication) + final = 5 total
      expect(updates.length).toBeGreaterThanOrEqual(4);

      // The CRITICAL assertion: Final update must show "error" status
      const finalUpdate = updates[updates.length - 1];
      expect(finalUpdate.status).toBe("error"); // ❌ BUG: This was "executing" in production

      // Verify final update shows correct node statuses
      const additionExec = finalUpdate.nodeExecutions.find(ne => ne.nodeId === "addition");
      const subtractionExec = finalUpdate.nodeExecutions.find(ne => ne.nodeId === "subtraction");
      const multiplicationExec = finalUpdate.nodeExecutions.find(ne => ne.nodeId === "multiplication");

      expect(additionExec?.status).toBe("completed");
      expect(subtractionExec?.status).toBe("error");
      expect(multiplicationExec?.status).toBe("error");

      // Verify intermediate updates show progression
      // After addition completes, status should still be "executing"
      const updateAfterAddition = updates.find(u =>
        u.nodeExecutions.some(ne => ne.nodeId === "addition" && ne.status === "completed") &&
        !u.nodeExecutions.some(ne => ne.nodeId === "subtraction" && ne.status === "error")
      );
      if (updateAfterAddition) {
        expect(updateAfterAddition.status).toBe("executing");
      }

      // After subtraction fails, status should still be "executing" (not yet finished)
      const updateAfterSubtraction = updates.find(u =>
        u.nodeExecutions.some(ne => ne.nodeId === "subtraction" && ne.status === "error") &&
        u !== finalUpdate
      );
      if (updateAfterSubtraction) {
        expect(updateAfterSubtraction.status).toBe("executing");
      }
    });
  });
});
