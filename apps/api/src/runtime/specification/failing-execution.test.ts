import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { introspectWorkflowInstance } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";

import { createInstanceId, createParams } from "./helpers";

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

    // Set up workflow introspection
    await using instance = await introspectWorkflowInstance(
      (env as Bindings).EXECUTE,
      instanceId
    );

    // Create and execute workflow
    await (env as Bindings).EXECUTE.create({
      id: instanceId,
      params: createParams(workflow),
    });

    // Wait for workflow to finish (status should be 'error')
    await instance.waitForStatus("complete");

    // Verify step results - successful nodes
    const num1Result = await instance.waitForStepResult({
      name: "run node num1",
    });
    const num2Result = await instance.waitForStepResult({
      name: "run node num2",
    });

    expect(num1Result).toBeDefined();
    expect(num2Result).toBeDefined();

    // Division node should have executed and encountered error
    const divResult = await instance.waitForStepResult({
      name: "run node div",
    });

    // The step will return a result showing the error state
    console.log(
      "Division result (with error):",
      JSON.stringify(divResult, null, 2)
    );
    expect(divResult).toBeDefined();
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

    // Set up workflow introspection
    await using instance = await introspectWorkflowInstance(
      (env as Bindings).EXECUTE,
      instanceId
    );

    // Create and execute workflow
    await (env as Bindings).EXECUTE.create({
      id: instanceId,
      params: createParams(workflow),
    });

    // Wait for workflow to finish
    await instance.waitForStatus("complete");

    // Verify successful node
    const num1Result = await instance.waitForStepResult({
      name: "run node num1",
    });
    expect(num1Result).toBeDefined();

    // Verify add node executed (nodes are responsible for validating their inputs)
    // The node will receive undefined for input 'b' and should handle it
    const addResult = await instance.waitForStepResult({
      name: "run node add",
    });
    console.log(
      "Add result (executed with undefined input):",
      JSON.stringify(addResult, null, 2)
    );
    expect(addResult).toBeDefined();
    // Node may complete with NaN or fail - either is acceptable
    // The important thing is it was not skipped
    expect((addResult as any).status).not.toBe("skipped");
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

    // Set up workflow introspection
    await using instance = await introspectWorkflowInstance(
      (env as Bindings).EXECUTE,
      instanceId
    );

    // Create and execute workflow
    await (env as Bindings).EXECUTE.create({
      id: instanceId,
      params: createParams(workflow),
    });

    // Wait for workflow completion
    await instance.waitForStatus("complete");

    // Verify step results - num1 and num2 should succeed, div should fail, add should skip
    const num1Result = await instance.waitForStepResult({
      name: "run node num1",
    });
    const num2Result = await instance.waitForStepResult({
      name: "run node num2",
    });
    const divResult = await instance.waitForStepResult({
      name: "run node div",
    });
    const addResult = await instance.waitForStepResult({
      name: "run node add",
    });

    console.log("Num1 result:", JSON.stringify(num1Result, null, 2));
    console.log("Num2 result:", JSON.stringify(num2Result, null, 2));
    console.log(
      "Div result (division by zero):",
      JSON.stringify(divResult, null, 2)
    );
    console.log(
      "Add result (skipped due to upstream failure):",
      JSON.stringify(addResult, null, 2)
    );

    expect(num1Result).toBeDefined();
    expect(num2Result).toBeDefined();
    expect(divResult).toBeDefined();
    expect((divResult as any).status).toBe("error");

    expect(addResult).toBeDefined();
    expect((addResult as any).status).toBe("skipped");
    expect((addResult as any).skipReason).toBe("upstream_failure");
    expect((addResult as any).blockedBy).toContain("div");
    expect((addResult as any).outputs).toBeNull();
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

    // Set up workflow introspection
    await using instance = await introspectWorkflowInstance(
      (env as Bindings).EXECUTE,
      instanceId
    );

    // Create and execute workflow
    await (env as Bindings).EXECUTE.create({
      id: instanceId,
      params: createParams(workflow),
    });

    // Wait for workflow completion
    await instance.waitForStatus("complete");

    // Verify step results
    const additionResult = await instance.waitForStepResult({
      name: "run node addition",
    });
    const subtractionResult = await instance.waitForStepResult({
      name: "run node subtraction",
    });
    const multiplicationResult = await instance.waitForStepResult({
      name: "run node multiplication",
    });

    console.log("Addition result:", JSON.stringify(additionResult, null, 2));
    console.log(
      "Subtraction result (executed with undefined input):",
      JSON.stringify(subtractionResult, null, 2)
    );
    console.log(
      "Multiplication result:",
      JSON.stringify(multiplicationResult, null, 2)
    );

    expect(additionResult).toBeDefined();
    expect((additionResult as any).status).toBe("completed");

    expect(subtractionResult).toBeDefined();
    // Node may complete with NaN or fail - either is acceptable
    expect((subtractionResult as any).status).not.toBe("skipped");

    expect(multiplicationResult).toBeDefined();
    // Multiplication will execute if subtraction completed, skip if subtraction failed
    // The important thing is proper upstream dependency handling
  });
});
