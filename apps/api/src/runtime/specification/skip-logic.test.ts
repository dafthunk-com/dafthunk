import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { introspectWorkflowInstance } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";

import { createInstanceId, createParams } from "./helpers";

/**
 * Tests for skip logic and conditional execution
 */
  describe("skip logic and conditional execution", () => {
    it("should execute nodes even when required inputs are missing", async () => {
      const workflow: Workflow = {
        id: "test-workflow-skip-missing",
        name: "Execute with Missing Input",
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

      const instanceId = createInstanceId("skip-missing");

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

      // Verify num node succeeded
      const numResult = await instance.waitForStepResult({
        name: "run node num",
      });
      expect(numResult).toBeDefined();

      // Verify add node executed (not skipped) - nodes validate their own inputs
      const addResult = await instance.waitForStepResult({
        name: "run node add",
      });
      console.log(
        "Add result (executed with undefined input):",
        JSON.stringify(addResult, null, 2)
      );
      expect(addResult).toBeDefined();
      // Node executed (not skipped) - may complete or fail depending on node implementation
      expect((addResult as any).status).not.toBe("skipped");
    });

    it("should recursively skip downstream nodes when upstream node fails", async () => {
      const workflow: Workflow = {
        id: "test-workflow-recursive-skip",
        name: "Recursive Skip",
        handle: "recursive-skip",
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
            position: { x: 200, y: 0 },
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
            position: { x: 400, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true }, // Depends on div
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

      const instanceId = createInstanceId("recursive-skip");

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

      // Verify input nodes succeeded
      const num1Result = await instance.waitForStepResult({
        name: "run node num1",
      });
      const zeroResult = await instance.waitForStepResult({
        name: "run node zero",
      });
      expect(num1Result).toBeDefined();
      expect(zeroResult).toBeDefined();

      // All downstream nodes should be skipped due to cascading failures
      const divResult = await instance.waitForStepResult({
        name: "run node div",
      });
      const add2Result = await instance.waitForStepResult({
        name: "run node add2",
      });
      const add3Result = await instance.waitForStepResult({
        name: "run node add3",
      });

      console.log(
        "Recursive skip - div (failed - division by zero):",
        JSON.stringify(divResult, null, 2)
      );
      console.log(
        "Recursive skip - add2 (skipped - upstream failure):",
        JSON.stringify(add2Result, null, 2)
      );
      console.log(
        "Recursive skip - add3 (skipped - upstream failure):",
        JSON.stringify(add3Result, null, 2)
      );

      expect(divResult).toBeDefined();
      expect((divResult as any).status).toBe("error");

      expect(add2Result).toBeDefined();
      expect((add2Result as any).status).toBe("skipped");
      expect((add2Result as any).skipReason).toBe("upstream_failure");
      expect((add2Result as any).blockedBy).toContain("div");

      expect(add3Result).toBeDefined();
      expect((add3Result as any).status).toBe("skipped");
      expect((add3Result as any).skipReason).toBe("upstream_failure");
      expect((add3Result as any).blockedBy).toContain("add2");
    });
  });