import { describe, it, expect, beforeAll } from "vitest";
import { WorkflowRuntime } from "./workflowRuntime";
import { Workflow, WorkflowExecutionOptions } from "./workflowTypes";
import { registerNodes } from "./nodes/nodeRegistry";

// Ensure base nodes are registered
beforeAll(() => {
  registerNodes();
});

describe("WorkflowRuntime Integration Tests", () => {
  it("should execute a simple addition workflow", async () => {
    const workflow: Workflow = {
      id: "addition-workflow",
      name: "Addition Workflow",
      nodes: [
        {
          id: "input-node-1",
          name: "First Number",
          type: "addition",
          position: { x: 100, y: 100 },
          inputs: [
            { name: "a", type: "number", value: 5 },
            { name: "b", type: "number", value: 3 },
          ],
          outputs: [{ name: "result", type: "number" }],
        },
      ],
      edges: [],
    };

    const executedNodes: string[] = [];
    const nodeOutputs: Record<string, any> = {};

    const options: WorkflowExecutionOptions = {
      onNodeComplete: (nodeId, outputs) => {
        executedNodes.push(nodeId);
        nodeOutputs[nodeId] = outputs;
      },
    };

    const runtime = new WorkflowRuntime(workflow, options);
    await runtime.execute();

    expect(executedNodes).toHaveLength(1);
    expect(executedNodes[0]).toBe("input-node-1");
    expect(nodeOutputs["input-node-1"]).toHaveProperty("result", 8);
  });

  it("should execute a workflow with multiple mathematical operations", async () => {
    const workflow: Workflow = {
      id: "math-workflow",
      name: "Math Operations Workflow",
      nodes: [
        {
          id: "addition-node",
          name: "Addition",
          type: "addition",
          position: { x: 100, y: 100 },
          inputs: [
            { name: "a", type: "number", value: 10 },
            { name: "b", type: "number", value: 5 },
          ],
          outputs: [{ name: "result", type: "number" }],
        },
        {
          id: "multiplication-node",
          name: "Multiplication",
          type: "multiplication",
          position: { x: 300, y: 100 },
          inputs: [
            { name: "a", type: "number" },
            { name: "b", type: "number", value: 2 },
          ],
          outputs: [{ name: "result", type: "number" }],
        },
        {
          id: "subtraction-node",
          name: "Subtraction",
          type: "subtraction",
          position: { x: 500, y: 100 },
          inputs: [
            { name: "a", type: "number" },
            { name: "b", type: "number", value: 5 },
          ],
          outputs: [{ name: "result", type: "number" }],
        },
      ],
      edges: [
        {
          source: "addition-node",
          target: "multiplication-node",
          sourceOutput: "result",
          targetInput: "a",
        },
        {
          source: "multiplication-node",
          target: "subtraction-node",
          sourceOutput: "result",
          targetInput: "a",
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

    const runtime = new WorkflowRuntime(workflow, options);
    await runtime.execute();

    // Verify execution order
    expect(executedNodes).toHaveLength(3);
    expect(executedNodes[0]).toBe("addition-node");
    expect(executedNodes[1]).toBe("multiplication-node");
    expect(executedNodes[2]).toBe("subtraction-node");

    // Verify calculations
    // Addition: 10 + 5 = 15
    expect(nodeOutputs["addition-node"]).toHaveProperty("result", 15);
    // Multiplication: 15 * 2 = 30
    expect(nodeOutputs["multiplication-node"]).toHaveProperty("result", 30);
    // Subtraction: 30 - 5 = 25
    expect(nodeOutputs["subtraction-node"]).toHaveProperty("result", 25);
  });

  it("should handle division by zero error", async () => {
    const workflow: Workflow = {
      id: "division-error-workflow",
      name: "Division Error Workflow",
      nodes: [
        {
          id: "division-node",
          name: "Division",
          type: "division",
          position: { x: 100, y: 100 },
          inputs: [
            { name: "a", type: "number", value: 10 },
            { name: "b", type: "number", value: 0 },
          ],
          outputs: [{ name: "result", type: "number" }],
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

    const runtime = new WorkflowRuntime(workflow, options);
    const result = await runtime.execute();

    // Check that the error was properly handled
    expect(nodeErrors["division-node"]).toBe("Division by zero is not allowed");
    // The runtime should still return a Map of outputs
    expect(result).toBeInstanceOf(Map);
    // But the node should be marked as having an error in the execution state
    const state = runtime.getExecutionState();
    expect(state.errorNodes.get("division-node")).toBe(
      "Division by zero is not allowed"
    );
  });

  it("should handle invalid number inputs", async () => {
    const workflow: Workflow = {
      id: "invalid-input-workflow",
      name: "Invalid Input Workflow",
      nodes: [
        {
          id: "addition-node",
          name: "Addition",
          type: "addition",
          position: { x: 100, y: 100 },
          inputs: [
            { name: "a", type: "number", value: "not a number" },
            { name: "b", type: "number", value: 5 },
          ],
          outputs: [{ name: "result", type: "number" }],
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

    const runtime = new WorkflowRuntime(workflow, options);
    const result = await runtime.execute();

    // Check that the error was properly handled
    expect(nodeErrors["addition-node"]).toBe("Both inputs must be numbers");
    // The runtime should still return a Map of outputs
    expect(result).toBeInstanceOf(Map);
    // But the node should be marked as having an error in the execution state
    const state = runtime.getExecutionState();
    expect(state.errorNodes.get("addition-node")).toBe(
      "Both inputs must be numbers"
    );
  });
});
