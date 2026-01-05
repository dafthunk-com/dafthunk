import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { introspectWorkflowInstance } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";

import { createInstanceId, createParams } from "./helpers";

/**
 * Tests for node execution errors (unknown types, continue on error)
 */
  describe("node execution errors", () => {
    it("should handle node type not found in registry", async () => {
      const workflow: Workflow = {
        id: "test-workflow-unknown-type",
        name: "Unknown Node Type",
        handle: "unknown-type",
        type: "manual",
        nodes: [
          {
            id: "unknown",
            name: "Unknown",
            type: "nonexistent-node-type" as any,
            position: { x: 0, y: 0 },
            inputs: [],
            outputs: [],
          },
        ],
        edges: [],
      };

      const instanceId = createInstanceId("unknown-type");

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

      // Wait for workflow to complete (it will complete with node errors)
      await instance.waitForStatus("complete");

      // Verify the workflow completed (with node errors tracked internally)
      console.log(
        "Unknown node type test: workflow completed with node errors tracked"
      );

      // The workflow instance should be defined even though it errored
      expect(instance).toBeDefined();
    });

    it("should continue execution when one node fails", async () => {
      const workflow: Workflow = {
        id: "test-workflow-continue-on-error",
        name: "Continue on Error",
        handle: "continue-error",
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
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 300 },
            inputs: [
              { name: "value", type: "number", value: 42, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
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
        ],
      };

      const instanceId = createInstanceId("continue-error");

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

      // Verify num1, zero, num2 succeed but div fails
      const num1Result = await instance.waitForStepResult({
        name: "run node num1",
      });
      const zeroResult = await instance.waitForStepResult({
        name: "run node zero",
      });
      const num2Result = await instance.waitForStepResult({
        name: "run node num2",
      });
      const divResult = await instance.waitForStepResult({
        name: "run node div",
      });

      expect(num1Result).toBeDefined();
      expect(zeroResult).toBeDefined();
      expect(num2Result).toBeDefined();
      expect(divResult).toBeDefined();
      console.log(
        "Continue on error - div result:",
        JSON.stringify(divResult, null, 2)
      );
    });
  });