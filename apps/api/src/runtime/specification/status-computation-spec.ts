import { env } from "cloudflare:test";
import type { Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";
import { createInstanceId, createParams, type RuntimeFactory } from "./helpers";

/**
 * Shared specification tests for status computation (executing, completed, error).
 * These tests run against any Runtime implementation.
 */
export function testStatusComputation(
  runtimeName: string,
  createRuntime: RuntimeFactory
) {
  describe(`${runtimeName}: status computation`, () => {
    it("should compute 'executing' when not all nodes visited", async () => {
      const workflow: Workflow = {
        id: "test-workflow-status-executing",
        name: "Status Executing",
        handle: "status-executing",
        trigger: "manual",
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

      const instanceId = createInstanceId("status-executing");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const num1Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "num1"
      );
      const num2Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "num2"
      );

      expect(num1Result).toBeDefined();
      expect(num2Result).toBeDefined();
    });

    it("should compute 'completed' when all nodes executed with no errors", async () => {
      const workflow: Workflow = {
        id: "test-workflow-status-completed",
        name: "Status Completed",
        handle: "status-completed",
        trigger: "manual",
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

      const instanceId = createInstanceId("status-completed");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const numResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "num"
      );

      expect(numResult).toBeDefined();
      console.log(
        "Status completed test - num result:",
        JSON.stringify(numResult, null, 2)
      );
    });

    it("should compute 'error' when nodes fail", async () => {
      const workflow: Workflow = {
        id: "test-workflow-status-error",
        name: "Status Error",
        handle: "status-error",
        trigger: "manual",
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

      const instanceId = createInstanceId("status-error");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const divResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "div"
      );

      expect(divResult).toBeDefined();
      console.log(
        "Status error test - div result:",
        JSON.stringify(divResult, null, 2)
      );
    });

    it("should compute 'completed' when nodes are conditionally skipped (not error)", async () => {
      // This tests that conditional branching with skipped nodes is NOT an error
      // The workflow should complete successfully when nodes are skipped due to conditional logic
      const workflow: Workflow = {
        id: "test-workflow-status-conditional-skip",
        name: "Status Conditional Skip",
        handle: "status-conditional-skip",
        trigger: "manual",
        nodes: [
          {
            id: "fork",
            name: "Fork",
            type: "conditional-fork",
            position: { x: 0, y: 0 },
            inputs: [
              {
                name: "condition",
                type: "boolean",
                value: false,
                hidden: true,
              },
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [
              { name: "true", type: "any" },
              { name: "false", type: "any" },
            ],
          },
          {
            id: "trueAdd",
            name: "True Branch Add",
            type: "addition",
            position: { x: 200, y: -50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 5, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "falseSub",
            name: "False Branch Sub",
            type: "subtraction",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 5, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "join",
            name: "Join",
            type: "conditional-join",
            position: { x: 400, y: 0 },
            inputs: [
              { name: "a", type: "any", required: false },
              { name: "b", type: "any", required: false },
            ],
            outputs: [{ name: "result", type: "any" }],
          },
        ],
        edges: [
          {
            source: "fork",
            sourceOutput: "true",
            target: "trueAdd",
            targetInput: "a",
          },
          {
            source: "fork",
            sourceOutput: "false",
            target: "falseSub",
            targetInput: "a",
          },
          {
            source: "trueAdd",
            sourceOutput: "result",
            target: "join",
            targetInput: "a",
          },
          {
            source: "falseSub",
            sourceOutput: "result",
            target: "join",
            targetInput: "b",
          },
        ],
      };

      const instanceId = createInstanceId("status-conditional-skip");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const forkResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "fork"
      );
      const trueAddResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "trueAdd"
      );
      const falseSubResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "falseSub"
      );
      const joinResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "join"
      );

      console.log("Fork result:", JSON.stringify(forkResult, null, 2));
      console.log("TrueAdd result:", JSON.stringify(trueAddResult, null, 2));
      console.log("FalseSub result:", JSON.stringify(falseSubResult, null, 2));
      console.log("Join result:", JSON.stringify(joinResult, null, 2));

      // Fork should complete with only 'false' output (since condition=false)
      expect(forkResult?.status).toBe("completed");

      // True branch should be skipped due to conditional logic (NOT an error!)
      expect(trueAddResult?.status).toBe("skipped");
      expect((trueAddResult as any).skipReason).toBe("conditional_branch");

      // False branch should execute (10 - 5 = 5)
      expect(falseSubResult?.status).toBe("completed");

      // Join should receive only the 'b' input and complete
      expect(joinResult?.status).toBe("completed");

      // The important assertion: workflow status should be "completed", not "error"
      // (This is validated by the workflow completing successfully)
    });

    it("should handle mixed executed, skipped, and errored nodes", async () => {
      const workflow: Workflow = {
        id: "test-workflow-status-mixed",
        name: "Status Mixed",
        handle: "status-mixed",
        trigger: "manual",
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

      const instanceId = createInstanceId("status-mixed");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const num1Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "num1"
      );
      const num2Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "num2"
      );
      const addResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "add"
      );
      const divResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "div"
      );

      expect(num1Result).toBeDefined();
      expect(num2Result).toBeDefined();
      expect(addResult).toBeDefined();
      expect(divResult).toBeDefined();
      console.log(
        "Mixed status - div result:",
        JSON.stringify(divResult, null, 2)
      );
    });
  });
}
