import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";

import {
  createInstanceId,
  createParams,
  type RuntimeFactory,
} from "./helpers";

/**
 * Shared specification tests for multiple concurrent errors and cascading failures.
 * These tests run against any BaseRuntime implementation.
 */
export function testConcurrentErrors(
  runtimeName: string,
  createRuntime: RuntimeFactory
) {
  describe(`${runtimeName}: multiple concurrent errors`, () => {
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
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const div1Result = execution.nodeExecutions.find(e => e.nodeId === "div1");
      const div2Result = execution.nodeExecutions.find(e => e.nodeId === "div2");

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
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const divResult = execution.nodeExecutions.find(e => e.nodeId === "div");
      const addResult = execution.nodeExecutions.find(e => e.nodeId === "add");
      const multResult = execution.nodeExecutions.find(e => e.nodeId === "mult");

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
      expect(divResult?.status).toBe("error");

      expect(addResult).toBeDefined();
      expect(addResult?.status).toBe("skipped");
      expect((addResult as any).skipReason).toBe("upstream_failure");
      expect((addResult as any).blockedBy).toContain("div");
      expect(addResult?.outputs).toBeNull();

      expect(multResult).toBeDefined();
      expect(multResult?.status).toBe("skipped");
      expect((multResult as any).skipReason).toBe("upstream_failure");
      expect((multResult as any).blockedBy).toContain("add");
      expect(multResult?.outputs).toBeNull();
    });
  });
}
