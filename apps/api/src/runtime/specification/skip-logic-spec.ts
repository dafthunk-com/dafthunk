import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";
import { createInstanceId, createParams, type RuntimeFactory } from "./helpers";

/**
 * Shared specification tests for skip logic and conditional execution.
 * These tests run against any BaseRuntime implementation.
 */
export function testSkipLogic(
  runtimeName: string,
  createRuntime: RuntimeFactory
) {
  describe(`${runtimeName}: skip logic and conditional execution`, () => {
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
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const numResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "num"
      );
      expect(numResult).toBeDefined();

      const addResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "add"
      );
      console.log(
        "Add result (executed with undefined input):",
        JSON.stringify(addResult, null, 2)
      );
      expect(addResult).toBeDefined();
      // Node executed (not skipped) - may complete or fail depending on node implementation
      expect(addResult?.status).not.toBe("skipped");
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
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const num1Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "num1"
      );
      const zeroResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "zero"
      );
      expect(num1Result).toBeDefined();
      expect(zeroResult).toBeDefined();

      const divResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "div"
      );
      const add2Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "add2"
      );
      const add3Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "add3"
      );

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
      expect(divResult?.status).toBe("error");

      expect(add2Result).toBeDefined();
      expect(add2Result?.status).toBe("skipped");
      expect((add2Result as any).skipReason).toBe("upstream_failure");
      expect((add2Result as any).blockedBy).toContain("div");

      expect(add3Result).toBeDefined();
      expect(add3Result?.status).toBe("skipped");
      expect((add3Result as any).skipReason).toBe("upstream_failure");
      expect((add3Result as any).blockedBy).toContain("add2");
    });
  });
}
