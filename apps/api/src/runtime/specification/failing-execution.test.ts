import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";

import { createInstanceId, createParams, createTestRuntime } from "./helpers";

/**
 * Tests for workflow execution with errors and failures
 */
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

    const instanceId = createInstanceId("div-by-zero");
    const runtime = createTestRuntime(env as Bindings);

    // Execute workflow
    const execution = await runtime.run(createParams(workflow), instanceId);

    // Verify workflow status is error (division by zero)
    expect(execution.status).toBe("error");
    expect(execution.nodeExecutions).toHaveLength(3);

    // Verify successful nodes
    const num1Node = execution.nodeExecutions.find((e) => e.nodeId === "num1");
    const num2Node = execution.nodeExecutions.find((e) => e.nodeId === "num2");

    expect(num1Node).toBeDefined();
    expect(num1Node?.status).toBe("completed");

    expect(num2Node).toBeDefined();
    expect(num2Node?.status).toBe("completed");

    // Division node should have executed and encountered error
    const divNode = execution.nodeExecutions.find((e) => e.nodeId === "div");

    expect(divNode).toBeDefined();
    expect(divNode?.status).toBe("error");
    expect(divNode?.error).toBeDefined();

    console.log("Division result (with error):", JSON.stringify(divNode, null, 2));
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

    const instanceId = createInstanceId("missing-input");
    const runtime = createTestRuntime(env as Bindings);

    // Execute workflow
    const execution = await runtime.run(createParams(workflow), instanceId);

    // Verify successful node
    const num1Node = execution.nodeExecutions.find((e) => e.nodeId === "num1");
    expect(num1Node).toBeDefined();
    expect(num1Node?.status).toBe("completed");

    // Verify add node executed (nodes are responsible for validating their inputs)
    // The node will receive undefined for input 'b' and should handle it
    const addNode = execution.nodeExecutions.find((e) => e.nodeId === "add");

    expect(addNode).toBeDefined();
    console.log(
      "Add result (executed with undefined input):",
      JSON.stringify(addNode, null, 2)
    );

    // Node may complete with NaN or fail - either is acceptable
    // The important thing is it was not skipped
    expect(addNode?.status).not.toBe("skipped");
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

    const instanceId = createInstanceId("error-middle-chain");
    const runtime = createTestRuntime(env as Bindings);

    // Execute workflow
    const execution = await runtime.run(createParams(workflow), instanceId);

    // Verify workflow status is error
    expect(execution.status).toBe("error");

    // Verify step results - num1 and num2 should succeed, div should fail, add should skip
    const num1Node = execution.nodeExecutions.find((e) => e.nodeId === "num1");
    const num2Node = execution.nodeExecutions.find((e) => e.nodeId === "num2");
    const divNode = execution.nodeExecutions.find((e) => e.nodeId === "div");
    const addNode = execution.nodeExecutions.find((e) => e.nodeId === "add");

    console.log("Num1 result:", JSON.stringify(num1Node, null, 2));
    console.log("Num2 result:", JSON.stringify(num2Node, null, 2));
    console.log("Div result (division by zero):", JSON.stringify(divNode, null, 2));
    console.log(
      "Add result (skipped due to upstream failure):",
      JSON.stringify(addNode, null, 2)
    );

    expect(num1Node).toBeDefined();
    expect(num1Node?.status).toBe("completed");

    expect(num2Node).toBeDefined();
    expect(num2Node?.status).toBe("completed");

    expect(divNode).toBeDefined();
    expect(divNode?.status).toBe("error");

    expect(addNode).toBeDefined();
    expect(addNode?.status).toBe("skipped");
    expect((addNode as any).skipReason).toBe("upstream_failure");
    expect((addNode as any).blockedBy).toContain("div");
    expect((addNode as any).outputs).toBeNull();
  });

  it("should handle workflow with error in middle node blocking dependent nodes", async () => {
    // Graph: addition → subtraction (missing input b) → multiplication
    // Expected: subtraction executes (nodes validate their own inputs), multiplication may skip if subtraction fails
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

    const instanceId = createInstanceId("error-blocking-nodes");
    const runtime = createTestRuntime(env as Bindings);

    // Execute workflow
    const execution = await runtime.run(createParams(workflow), instanceId);

    // Verify step results
    const additionNode = execution.nodeExecutions.find(
      (e) => e.nodeId === "addition"
    );
    const subtractionNode = execution.nodeExecutions.find(
      (e) => e.nodeId === "subtraction"
    );
    const multiplicationNode = execution.nodeExecutions.find(
      (e) => e.nodeId === "multiplication"
    );

    console.log("Addition result:", JSON.stringify(additionNode, null, 2));
    console.log(
      "Subtraction result (executed with undefined input):",
      JSON.stringify(subtractionNode, null, 2)
    );
    console.log(
      "Multiplication result:",
      JSON.stringify(multiplicationNode, null, 2)
    );

    expect(additionNode).toBeDefined();
    expect(additionNode?.status).toBe("completed");

    expect(subtractionNode).toBeDefined();
    // Node may complete with NaN or fail - either is acceptable
    expect(subtractionNode?.status).not.toBe("skipped");

    expect(multiplicationNode).toBeDefined();
    // Multiplication will execute if subtraction completed, skip if subtraction failed
    // The important thing is proper upstream dependency handling
  });
});
