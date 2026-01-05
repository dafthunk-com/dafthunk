import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { introspectWorkflowInstance } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";

import { createInstanceId, createParams } from "./helpers";

/**
 * Tests for multiple concurrent errors and cascading failures
 */
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

      const instanceId = createInstanceId("multi-error");

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

      // Wait for workflow completion (status should be 'error')
      await instance.waitForStatus("complete");

      // Verify step results
      const div1Result = await instance.waitForStepResult({
        name: "run node div1",
      });
      const div2Result = await instance.waitForStepResult({
        name: "run node div2",
      });

      console.log(
        "Div1 result (division by zero):",
        JSON.stringify(div1Result, null, 2)
      );
      console.log(
        "Div2 result (division by zero):",
        JSON.stringify(div2Result, null, 2)
      );

      expect(div1Result).toBeDefined();
      expect(div2Result).toBeDefined();
    });

    it("should handle cascading errors (error → skipped → skipped)", async () => {
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

      const instanceId = createInstanceId("cascading-errors");

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
      const divResult = await instance.waitForStepResult({
        name: "run node div",
      });
      const addResult = await instance.waitForStepResult({
        name: "run node add",
      });
      const multResult = await instance.waitForStepResult({
        name: "run node mult",
      });

      console.log(
        "Div result (division by zero):",
        JSON.stringify(divResult, null, 2)
      );
      console.log(
        "Add result (skipped - upstream failure):",
        JSON.stringify(addResult, null, 2)
      );
      console.log(
        "Mult result (skipped - upstream failure):",
        JSON.stringify(multResult, null, 2)
      );

      expect(divResult).toBeDefined();
      expect((divResult as any).status).toBe("error");

      expect(addResult).toBeDefined();
      expect((addResult as any).status).toBe("skipped");
      expect((addResult as any).skipReason).toBe("upstream_failure");
      expect((addResult as any).blockedBy).toContain("div");
      expect((addResult as any).outputs).toBeNull();

      expect(multResult).toBeDefined();
      expect((multResult as any).status).toBe("skipped");
      expect((multResult as any).skipReason).toBe("upstream_failure");
      expect((multResult as any).blockedBy).toContain("add");
      expect((multResult as any).outputs).toBeNull();
    });
  });