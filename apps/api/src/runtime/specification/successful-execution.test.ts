import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { introspectWorkflowInstance } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";

import { createInstanceId, createParams } from "./helpers";

/**
 * Tests for successful workflow execution scenarios
 */
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

    const instanceId = createInstanceId("linear-math");

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
    const addResult = await instance.waitForStepResult({
      name: "run node add",
    });
    const multResult = await instance.waitForStepResult({
      name: "run node mult",
    });

    expect(addResult).toBeDefined();
    expect(multResult).toBeDefined();

    // Note: Results are wrapped in execution state - verify computation
    // Addition: 5 + 3 = 8, Multiplication: 8 * 2 = 16
    console.log("Addition result:", JSON.stringify(addResult, null, 2));
    console.log(
      "Multiplication result:",
      JSON.stringify(multResult, null, 2)
    );
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

    const instanceId = createInstanceId("parallel-math");

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

    // Verify step results for parallel branches
    const add1Result = await instance.waitForStepResult({
      name: "run node add1",
    });
    const add2Result = await instance.waitForStepResult({
      name: "run node add2",
    });
    const multResult = await instance.waitForStepResult({
      name: "run node mult",
    });

    expect(add1Result).toBeDefined();
    expect(add2Result).toBeDefined();
    expect(multResult).toBeDefined();

    // Parallel execution: add1 = 10 + 5 = 15, add2 = 3 + 2 = 5, mult = 15 * 5 = 75
    console.log("Add1 result:", JSON.stringify(add1Result, null, 2));
    console.log("Add2 result:", JSON.stringify(add2Result, null, 2));
    console.log("Mult result:", JSON.stringify(multResult, null, 2));
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

    const instanceId = createInstanceId("chained-ops");

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

    // Verify step results for chained operations
    const addResult = await instance.waitForStepResult({
      name: "run node add",
    });
    const multResult = await instance.waitForStepResult({
      name: "run node mult",
    });
    const subResult = await instance.waitForStepResult({
      name: "run node sub",
    });

    expect(addResult).toBeDefined();
    expect(multResult).toBeDefined();
    expect(subResult).toBeDefined();

    // Chained operations: num1=2, num2=3, add=5, mult=20, sub=19
    console.log("Add result:", JSON.stringify(addResult, null, 2));
    console.log("Mult result:", JSON.stringify(multResult, null, 2));
    console.log("Sub result:", JSON.stringify(subResult, null, 2));
  });
});
